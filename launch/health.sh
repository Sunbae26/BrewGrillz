#!/bin/bash
# After pointing the domain: checks DNS, the website, the API, SSL and email records in one go.
#   bash launch/health.sh brewgrillz.sg
D=${1:-brewgrillz.sg}
ok() { printf "  \033[32m✔\033[0m %s\n" "$1"; }
bad() { printf "  \033[31m✘\033[0m %s\n" "$1"; FAIL=1; }
FAIL=0

echo "1. DNS"
for R in 1.1.1.1 8.8.8.8; do
  for H in $D www.$D api.$D; do
    IP=$(dig +short $H @$R | tail -1)
    [[ -n "$IP" ]] && ok "$H @$R -> $IP" || bad "$H @$R -> nothing"
  done
done

echo "2. Website"
for U in https://www.$D https://www.$D/menu https://www.$D/reserve https://www.$D/robots.txt https://www.$D/sitemap.xml https://www.$D/og-image.jpg; do
  C=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 20 $U)
  [[ "$C" == 200 ]] && ok "$U $C" || bad "$U $C"
done
C=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 30 https://$D)
[[ "$C" == 30* ]] && ok "https://$D redirects -> ${C#* }" || bad "https://$D $C (should redirect to www)"
C=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 https://www.$D/admin)
[[ "$C" == 200 ]] && ok "dashboard page loads ($C)" || bad "dashboard page $C"

echo "3. API and database"
P=$(curl -s --max-time 30 https://api.$D/api/ping)
[[ "$P" == *'"ok"'* ]] && ok "api ping" || bad "api ping ${P:-no answer}"
H=$(curl -s --max-time 30 https://api.$D/api/health)
[[ "$H" == *'"ok"'* ]] && ok "api health (database)" || bad "api health ${H:-no answer}"
for U in https://api.$D/api/menu https://www.$D/api/menu; do
  C=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 $U)
  [[ "$C" == 200 ]] && ok "$U $C" || bad "$U $C"
done
CORS=$(curl -s -D - -o /dev/null -H "Origin: https://www.$D" https://api.$D/api/menu | tr -d '\r' | grep -i "access-control-allow-origin")
[[ -n "$CORS" ]] && ok "CORS allows the website" || bad "CORS doesn't allow https://www.$D"

echo "4. SSL certificates"
for H in $D www.$D api.$D; do
  E=$(echo | openssl s_client -servername $H -connect $H:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  [[ -n "$E" ]] && ok "$H valid until $E" || bad "$H no valid certificate"
done

echo "5. Email records (Resend)"
dig +short TXT resend._domainkey.$D | grep -q "p=" && ok "Resend DKIM" || bad "Resend DKIM missing"
M=$(dig +short MX send.$D)
[[ -n "$M" ]] && ok "Resend send MX $M" || bad "Resend send MX missing"
dig +short TXT $D | grep -qi "v=spf1" && ok "SPF record" || bad "SPF record missing"

echo
[[ $FAIL == 0 ]] && echo "ALL GOOD ✅" || echo "SOMETHING NEEDS A LOOK ❌"
