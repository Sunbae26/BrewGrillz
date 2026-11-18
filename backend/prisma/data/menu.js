// The BrewGrillz menu (Dining Menu, revamped Jan 2026).
// `npm run dev` in the backend notices changes to this file and updates the database.
// Prices are in dollars. Dishes or drinks removed from here are hidden on the site, not deleted.
// Drinks: `prices` has one entry per column in `cols` (null where that size isn't sold).
// `orderable: false` means dine-in only (alcohol can never be ordered online).

export const notes = {
  "prices": "Prices are inclusive of the prevailing GST. A 10% service charge applies to all dine-in orders.",
  "dietary": "Dietary tags are a guide only. Please tell our team about any allergies before ordering."
};

export const categories = [
  {
    "slug": "starters",
    "name": "Starters",
    "group": "FOOD",
    "aliases": [
      "bites",
      "appetizers"
    ],
    "note": null,
    "orderable": true,
    "items": [
      {
        "slug": "chicken-wings",
        "name": "BrewGrillz Signature Chicken Wings",
        "description": "Juicy chicken wings marinated in our chef's signature blend of secret spices, served with our fiery in-house chilli sauce for the perfect kick.",
        "price": 10.9,
        "image": "chicken-wings",
        "tags": [
          "chefs-choice",
          "spicy"
        ]
      },
      {
        "slug": "truffle-fries",
        "name": "Truffle Fries",
        "description": "Golden fries generously seasoned with truffle oil, grated parmesan and fresh parsley. An indulgent treat.",
        "price": 8.5,
        "image": "truffle-fries",
        "tags": [
          "veg"
        ]
      },
      {
        "slug": "salt-pepper-squid",
        "name": "Salt & Pepper Squid",
        "description": "Crispy golden squid tossed in sea salt and black pepper, served with creamy Sriracha mayo and wasabi mayo.",
        "price": 10.9,
        "image": "salt-pepper-squid",
        "tags": []
      },
      {
        "slug": "mini-sliders",
        "name": "Mini Sliders Trio",
        "description": "Three sliders on soft brioche buns: juicy beef with cheddar, BBQ chicken with coleslaw, and a vegetarian mushroom spinach blend.",
        "price": 14.9,
        "image": "mini-sliders",
        "tags": [
          "chefs-choice",
          "sharing"
        ]
      },
      {
        "slug": "quesadilla",
        "name": "Chicken or Veg Quesadilla",
        "description": "Crisp grilled tortilla loaded with chicken or seasoned vegetables, melted cheese, sautéed onions and peppers. Served with zesty salsa and sour cream.",
        "price": 12.9,
        "image": null,
        "tags": [],
        "options": [
          {
            "name": "Filling",
            "choices": [
              "Chicken",
              "Vegetable"
            ]
          }
        ]
      },
      {
        "slug": "stuffed-mushrooms",
        "name": "Spinach & Cheese Stuffed Mushrooms",
        "description": "Baked button mushrooms filled with a creamy mix of spinach and cheese, topped with golden breadcrumbs for a delightful crunch.",
        "price": 9.9,
        "image": "stuffed-mushrooms",
        "tags": [
          "veg"
        ]
      },
      {
        "slug": "nachos",
        "name": "BrewGrillz Nachos Supreme",
        "description": "Crispy tortilla chips piled high with melted cheddar, jalapeños, sour cream, guacamole and your choice of pulled chicken or beef chilli.",
        "price": 12.5,
        "image": "nachos",
        "tags": [
          "sharing"
        ],
        "options": [
          {
            "name": "Topping",
            "choices": [
              "Pulled chicken",
              "Beef chilli"
            ]
          }
        ]
      },
      {
        "slug": "cheesy-wedges",
        "name": "Cheesy Wedges",
        "description": "Crispy potato wedges generously loaded with melted cheese, served with house dip.",
        "price": 10.9,
        "image": null,
        "tags": [
          "veg"
        ]
      },
      {
        "slug": "bruschetta",
        "name": "Bruschetta Pomodoro",
        "description": "Toasted artisan bread topped with grated parmesan, fresh tomato concassé, garlic, basil and extra virgin olive oil.",
        "price": 8.5,
        "image": null,
        "tags": [
          "chefs-choice",
          "veg"
        ]
      },
      {
        "slug": "burrata-salad",
        "name": "Burrata Salad with Pesto Drizzle",
        "description": "Creamy burrata served on fresh greens, finished with a fragrant basil pesto drizzle.",
        "price": 12.9,
        "image": null,
        "tags": [
          "veg"
        ]
      },
      {
        "slug": "caesar-salad",
        "name": "Caesar Salad",
        "description": "Crisp romaine lettuce, parmesan shavings, garlic croutons and classic Caesar dressing.",
        "price": 10.9,
        "image": null,
        "tags": []
      },
      {
        "slug": "kick-in-shrimp",
        "name": "Kick-In Shrimp",
        "description": "Crispy fried shrimp tossed in our signature spicy sauce with a bold, zesty kick.",
        "price": 11.9,
        "image": null,
        "tags": [
          "spicy"
        ]
      },
      {
        "slug": "shrimp-skewers",
        "name": "Spicy Grilled Shrimp Skewers",
        "description": "Tender shrimp marinated in a bold chilli-garlic mix, grilled to perfection and served with a zesty lime yoghurt dip.",
        "price": 11.9,
        "image": "shrimp-skewers",
        "tags": [
          "spicy"
        ]
      }
    ]
  },
  {
    "slug": "soups",
    "name": "Soups",
    "group": "FOOD",
    "aliases": [],
    "note": null,
    "orderable": true,
    "items": [
      {
        "slug": "mushroom-soup",
        "name": "Wild Truffle-Infused Mushroom",
        "description": "Velvety mushroom soup infused with aromatic wild truffle oil, finished with herbs for a rich, earthy depth.",
        "price": 7.5,
        "image": "mushroom-soup",
        "tags": [
          "veg"
        ]
      },
      {
        "slug": "minestrone",
        "name": "Beef Minestrone",
        "description": "Hearty Italian-style soup with tender beef, seasonal vegetables and herbs simmered in a rich tomato broth.",
        "price": 9.9,
        "image": null,
        "tags": [
          "chefs-choice"
        ]
      }
    ]
  },
  {
    "slug": "skewers",
    "name": "Skewers & Kebabs",
    "group": "FOOD",
    "aliases": [],
    "note": "Served with salad and butter raisin rice.",
    "orderable": true,
    "items": [
      {
        "slug": "shish-tawook",
        "name": "Chicken Shish Tawook",
        "description": "Chicken thigh chunks marinated in garlic, lemon, onions, saffron and Mediterranean spices, grilled and paired with a creamy garlic & spicy sauce.",
        "price": 16.9,
        "image": "shish-tawook",
        "tags": []
      },
      {
        "slug": "lamb-kofte",
        "name": "Lamb Kofte",
        "description": "Middle Eastern-inspired skewers of minced lamb seasoned with aromatic spices, served with a cooling tzatziki sauce.",
        "price": 18.5,
        "image": "lamb-kofte",
        "tags": []
      }
    ]
  },
  {
    "slug": "pizza",
    "name": "Pizza",
    "group": "FOOD",
    "aliases": [],
    "note": "Pizzalicious picks, baked to order.",
    "orderable": true,
    "items": [
      {
        "slug": "margherita",
        "name": "Margherita",
        "description": "Creamy mozzarella, tangy San Marzano tomatoes and fragrant fresh basil. The classic Neapolitan-style pizza.",
        "price": 16.9,
        "image": "margherita",
        "tags": [
          "veg"
        ]
      },
      {
        "slug": "veggie-lover",
        "name": "BrewGrillz Veggie Lover",
        "description": "Bell peppers, mushrooms, onions, olives and zucchini over a spicy arrabbiata base, topped with mozzarella and cheddar.",
        "price": 16.9,
        "image": null,
        "tags": [
          "veg",
          "spicy"
        ]
      },
      {
        "slug": "calzone",
        "name": "Calzone",
        "description": "A folded pizza generously filled with melted mozzarella, tomato sauce and savoury fillings, baked until golden and crisp.",
        "price": 16.9,
        "image": null,
        "tags": []
      },
      {
        "slug": "honey-garlic-pizza",
        "name": "Honey Garlic Chicken (Signature)",
        "description": "Sweet meets savoury: tender chicken breast marinated in a rich, aromatic blend of honey, garlic and herbs.",
        "price": 17.9,
        "image": "honey-garlic-pizza",
        "tags": [
          "signature",
          "chefs-choice"
        ]
      },
      {
        "slug": "hawaiian",
        "name": "Hawaiian",
        "description": "Sweet pineapple and smoky chicken ham with melted mozzarella on a rich tomato base.",
        "price": 17.9,
        "image": "hawaiian",
        "tags": []
      },
      {
        "slug": "pizzotto",
        "name": "Pizzotto",
        "description": "A cheese-forward creation with a soft, indulgent centre, finished with BrewGrillz signature toppings.",
        "price": 17.9,
        "image": null,
        "tags": []
      },
      {
        "slug": "bbq-meat-lover",
        "name": "BBQ Meat Lover",
        "description": "A hearty selection of premium meats layered with smoky BBQ sauce and mozzarella.",
        "price": 18.9,
        "image": "bbq-meat-lover",
        "tags": []
      },
      {
        "slug": "pesto-pizza",
        "name": "Pesto Pizza",
        "description": "Fragrant basil pesto replaces the tomato base, topped with mozzarella and selected ingredients.",
        "price": 18.9,
        "image": null,
        "tags": []
      },
      {
        "slug": "la-barca",
        "name": "Pizza La Barca (Truffle Mushroom)",
        "description": "A chef-crafted pizza on a creamy truffle mushroom base, inspired by coastal Italian flavours.",
        "price": 18.9,
        "image": null,
        "tags": []
      },
      {
        "slug": "spicy-seafood-pizza",
        "name": "Spicy Seafood",
        "description": "Prawns, calamari and seafood on a spicy tomato base, with heat and depth in every bite.",
        "price": 20.9,
        "image": null,
        "tags": [
          "spicy"
        ]
      }
    ]
  },
  {
    "slug": "pasta",
    "name": "Pasta & Risotto",
    "group": "FOOD",
    "aliases": [],
    "note": null,
    "orderable": true,
    "items": [
      {
        "slug": "penne-arrabbiata",
        "name": "Penne Arrabbiata",
        "description": "Al dente penne tossed in a fiery tomato sauce with garlic and chilli.",
        "price": 16.9,
        "image": "penne-arrabbiata",
        "tags": [
          "chefs-choice",
          "spicy",
          "veg"
        ]
      },
      {
        "slug": "aglio-olio",
        "name": "Spaghetti Aglio Olio",
        "description": "Spaghetti sautéed with olive oil, garlic and chilli flakes, with fresh seasonal vegetables.",
        "price": 16.9,
        "image": null,
        "tags": [
          "spicy",
          "veg"
        ]
      },
      {
        "slug": "alfredo",
        "name": "Spaghetti Alfredo",
        "description": "Silky Alfredo sauce with spaghetti, premium ham and parmesan.",
        "price": 16.9,
        "image": null,
        "tags": []
      },
      {
        "slug": "carbonara",
        "name": "Classic Spaghetti Carbonara",
        "description": "A rich, creamy egg-based sauce with crispy bacon and parmesan, finished in traditional Italian style.",
        "price": 17.9,
        "image": "carbonara",
        "tags": []
      },
      {
        "slug": "bolognaise",
        "name": "Spaghetti Bolognaise",
        "description": "Slow-simmered beef ragù in a rich tomato sauce over spaghetti.",
        "price": 17.9,
        "image": "bolognaise",
        "tags": []
      },
      {
        "slug": "penne-pesto",
        "name": "Penne Pesto",
        "description": "Fragrant basil pesto coats penne, finished with creamy buffalo mozzarella.",
        "price": 17.9,
        "image": null,
        "tags": [
          "chefs-choice",
          "veg"
        ]
      },
      {
        "slug": "vongole",
        "name": "Linguini Vongole",
        "description": "Fresh clams sautéed with garlic, olive oil and white wine. Light yet deeply flavourful.",
        "price": 19.9,
        "image": "vongole",
        "tags": []
      },
      {
        "slug": "marinara",
        "name": "Spaghetti Marinara",
        "description": "A seafood medley simmered in a robust tomato sauce.",
        "price": 20.9,
        "image": "marinara",
        "tags": []
      },
      {
        "slug": "seafood-linguini",
        "name": "BrewGrillz Seafood Linguini",
        "description": "Prawns, scallops and mussels tossed with linguini, a glaze of white wine, fresh lemon and parsley.",
        "price": 20.9,
        "image": null,
        "tags": [
          "signature"
        ]
      },
      {
        "slug": "risotto",
        "name": "Parmesan Risotto",
        "description": "Creamy parmesan risotto layered with spinach purée and topped with crispy fried calamari.",
        "price": 20.9,
        "image": null,
        "tags": []
      }
    ]
  },
  {
    "slug": "burgers",
    "name": "Signature Burgers",
    "group": "FOOD",
    "aliases": [],
    "note": null,
    "orderable": true,
    "items": [
      {
        "slug": "beef-burger",
        "name": "Premium Beef Burger with Cheese Raclette",
        "description": "Juicy beef patty with melted raclette, crisp bacon, crispy fried onions and arugula, with our signature house sauce in a toasted brioche bun.",
        "price": 19.9,
        "image": "beef-burger",
        "tags": [
          "signature",
          "chefs-choice"
        ]
      },
      {
        "slug": "chicken-burger",
        "name": "Premium Chicken Burger with Cheese Raclette",
        "description": "Tender chicken fillet with melted raclette, crisp bacon, crispy fried onions and arugula, with a bold spicy smoky mayo in a toasted brioche bun.",
        "price": 18.9,
        "image": null,
        "tags": [
          "signature",
          "spicy"
        ]
      }
    ]
  },
  {
    "slug": "grill",
    "name": "Steaks & Mains",
    "group": "FOOD",
    "aliases": [
      "mains",
      "steaks"
    ],
    "note": null,
    "orderable": true,
    "items": [
      {
        "slug": "tenderloin",
        "name": "Grass-Fed Tenderloin Steak (200g)",
        "description": "A premium cut, cooked to your liking, with truffle-infused potato purée and creamy mushroom sauce.",
        "price": 39.9,
        "image": "tenderloin",
        "tags": [
          "signature"
        ],
        "options": [
          {
            "name": "Doneness",
            "choices": [
              "Rare",
              "Medium rare",
              "Medium",
              "Medium well",
              "Well done"
            ]
          }
        ]
      },
      {
        "slug": "ribeye",
        "name": "Grass-Fed Ribeye Steak (250g)",
        "description": "Juicy, tender ribeye with garlic mash, sautéed green beans and your choice of red wine jus or peppercorn sauce.",
        "price": 34.9,
        "image": null,
        "tags": [
          "signature"
        ],
        "options": [
          {
            "name": "Doneness",
            "choices": [
              "Rare",
              "Medium rare",
              "Medium",
              "Medium well",
              "Well done"
            ]
          },
          {
            "name": "Sauce",
            "choices": [
              "Red wine jus",
              "Peppercorn sauce"
            ]
          }
        ]
      },
      {
        "slug": "sirloin",
        "name": "Sirloin Steak (200g)",
        "description": "Expertly seasoned and seared to your desired doneness. Bold, beefy flavour and rich marbling, with your choice of sides and sauce.",
        "price": 23.9,
        "image": "sirloin",
        "tags": [],
        "options": [
          {
            "name": "Doneness",
            "choices": [
              "Rare",
              "Medium rare",
              "Medium",
              "Medium well",
              "Well done"
            ]
          }
        ]
      },
      {
        "slug": "bbq-ribs",
        "name": "BBQ Pork Ribs",
        "description": "Fall-off-the-bone pork ribs glazed with smoky BBQ sauce, served with creamy coleslaw and sweet corn on the cob.",
        "price": 22.8,
        "image": "bbq-ribs",
        "tags": [],
        "variants": [
          {
            "name": "Half slab",
            "price": 22.8
          },
          {
            "name": "Full slab",
            "price": 38.9
          }
        ]
      },
      {
        "slug": "salmon",
        "name": "Herb-Crusted Salmon (200g)",
        "description": "Delicate salmon fillet with lemon-dill cream sauce, served with garlic butter rice.",
        "price": 22.9,
        "image": "salmon",
        "tags": []
      },
      {
        "slug": "pork-chop",
        "name": "Herb-Marinated Grilled Pork Chop (250g)",
        "description": "Bone-in pork chop with apple cider glaze, roasted sweet potatoes and buttered green peas.",
        "price": 17.9,
        "image": "pork-chop",
        "tags": []
      },
      {
        "slug": "chicken-chop",
        "name": "Grilled Chicken Chop (250g) with Black Peppercorn Sauce",
        "description": "Smoky, tender chicken thigh marinated in spices and herbs, with our in-house peppercorn sauce.",
        "price": 15.9,
        "image": "chicken-chop",
        "tags": []
      },
      {
        "slug": "fish-chips",
        "name": "BrewGrillz Fish & Chips",
        "description": "Crispy breadcrumbed white fish with thick-cut fries, house-made tartar sauce, tangy slaw and a wedge of lemon.",
        "price": 16.9,
        "image": null,
        "tags": [
          "signature"
        ]
      },
      {
        "slug": "schnitzel",
        "name": "Cajun Spiced Chicken Schnitzel",
        "description": "Chicken breast in Cajun-seasoned breadcrumbs, fried golden, with fries and zesty peppercorn sauce.",
        "price": 15.9,
        "image": null,
        "tags": [
          "spicy"
        ]
      }
    ]
  },
  {
    "slug": "platters",
    "name": "Platters",
    "group": "FOOD",
    "aliases": [],
    "note": "For 3–4 pax. Includes 2 sides of your choice.",
    "orderable": true,
    "items": [
      {
        "slug": "meat-platter",
        "name": "Meat Platter",
        "description": "Herb-marinated chicken thighs, grilled striploin with smoky BBQ glaze, spicy lamb koftas with mint yoghurt and crispy honey-soy pork belly. With roasted vegetables, mustard aioli and house BBQ sauce.",
        "price": 68,
        "image": "meat-platter",
        "tags": [
          "sharing"
        ]
      },
      {
        "slug": "mixed-grill",
        "name": "Mixed Grill Platter",
        "description": "Herb-marinated chicken thighs, garlic-lemon butter prawns, seared salmon with dill cream, spicy lamb koftas and BBQ glazed pork ribs. With lemon aioli, tartar sauce and house BBQ.",
        "price": 88,
        "image": "mixed-grill-platter",
        "tags": [
          "sharing"
        ]
      }
    ]
  },
  {
    "slug": "sides",
    "name": "Sides",
    "group": "FOOD",
    "aliases": [],
    "note": "$4.9 each.",
    "orderable": true,
    "items": [
      {
        "slug": "side-sweet-potato",
        "name": "Sweet Potato",
        "description": "Baked sweet potato chunks with a hint of cinnamon and sea salt.",
        "price": 4.9,
        "image": null,
        "tags": [
          "veg"
        ]
      },
      {
        "slug": "side-mash",
        "name": "Mashed Potato",
        "description": "Creamy, buttery mash whipped to smooth perfection.",
        "price": 4.9,
        "image": null,
        "tags": [
          "veg"
        ]
      },
      {
        "slug": "side-german-potato",
        "name": "German Potato Salad",
        "description": "Warm baby potatoes in a tangy mustard dressing with onions and herbs.",
        "price": 4.9,
        "image": null,
        "tags": [
          "veg"
        ]
      },
      {
        "slug": "side-corn",
        "name": "Corn on the Cob",
        "description": "Grilled corn glazed with butter. Sweet and smoky.",
        "price": 4.9,
        "image": null,
        "tags": [
          "veg"
        ]
      },
      {
        "slug": "side-gratin",
        "name": "Potato Gratin",
        "description": "Thinly sliced potatoes baked in cream and cheese until golden.",
        "price": 4.9,
        "image": null,
        "tags": [
          "veg"
        ]
      },
      {
        "slug": "side-coleslaw",
        "name": "Coleslaw",
        "description": "Crunchy cabbage and carrot slaw in a light, tangy mayo.",
        "price": 4.9,
        "image": null,
        "tags": [
          "veg"
        ]
      },
      {
        "slug": "side-spinach",
        "name": "Creamed Spinach",
        "description": "Silky spinach in a savoury cream sauce with garlic and parmesan.",
        "price": 4.9,
        "image": null,
        "tags": [
          "veg"
        ]
      },
      {
        "slug": "side-grilled-veg",
        "name": "Grilled Vegetables",
        "description": "Seasonal veggies, char-grilled and brushed with herb oil.",
        "price": 4.9,
        "image": null,
        "tags": [
          "veg"
        ]
      },
      {
        "slug": "side-baked-potato",
        "name": "Baked Potato",
        "description": "Crispy-skinned baked potato with butter and sour cream.",
        "price": 4.9,
        "image": null,
        "tags": [
          "veg"
        ]
      }
    ]
  },
  {
    "slug": "desserts",
    "name": "Desserts",
    "group": "FOOD",
    "aliases": [],
    "note": null,
    "orderable": true,
    "items": [
      {
        "slug": "tiramisu",
        "name": "Classic Tiramisu",
        "description": "Coffee-soaked ladyfingers, mascarpone cream and a dusting of cocoa.",
        "price": 8.5,
        "image": "tiramisu",
        "tags": []
      },
      {
        "slug": "panna-cotta",
        "name": "Mango Panna Cotta",
        "description": "Silky panna cotta topped with tangy mango coulis.",
        "price": 10.9,
        "image": null,
        "tags": []
      },
      {
        "slug": "lava-cake",
        "name": "Warm Chocolate Lava",
        "description": "Rich molten chocolate in a moist cake, served with vanilla ice cream.",
        "price": 12.5,
        "image": "lava-cake",
        "tags": []
      },
      {
        "slug": "ice-cream",
        "name": "Ice Cream",
        "description": "A creamy, indulgent scoop in your favourite flavour.",
        "price": 3.5,
        "image": null,
        "tags": [],
        "variants": [
          {
            "name": "Single scoop",
            "price": 3.5
          },
          {
            "name": "Double scoop",
            "price": 6.9
          }
        ]
      }
    ]
  },
  {
    "slug": "beer",
    "name": "Beer",
    "group": "DRINKS",
    "aliases": [],
    "note": null,
    "orderable": false,
    "sections": [
      {
        "slug": "on-tap",
        "title": "On tap",
        "sub": "Specially brewed for BrewGrillz by Brewerkz · pint of 480ml",
        "cols": [
          "Pint"
        ],
        "drinks": [
          {
            "slug": "beer-golden-ale",
            "name": "Golden Ale",
            "info": "English-style golden · 4.9% ABV · biscuit malt, smooth bitterness, floral & citrus",
            "prices": [
              13.5
            ]
          },
          {
            "slug": "beer-what-the-helles",
            "name": "What the Helles",
            "info": "Munich Helles · 4.5% ABV · clean, crisp, grainy-sweet",
            "prices": [
              13.5
            ]
          },
          {
            "slug": "beer-dream-blonde-ale",
            "name": "Dream Blonde Ale",
            "info": "Blonde ale · 4.5% ABV · white peach, coconut, pineapple",
            "prices": [
              13.5
            ]
          }
        ]
      },
      {
        "slug": "chilled-bottled-beers",
        "title": "Chilled bottled beers",
        "sub": "330ml · bucket of five",
        "cols": [
          "Bottle",
          "Bucket"
        ],
        "drinks": [
          {
            "slug": "beer-tiger",
            "name": "Tiger",
            "info": null,
            "prices": [
              9,
              40
            ]
          },
          {
            "slug": "beer-san-miguel-pale-pilsner",
            "name": "San Miguel Pale Pilsner",
            "info": null,
            "prices": [
              9,
              40
            ]
          },
          {
            "slug": "beer-corona",
            "name": "Corona",
            "info": null,
            "prices": [
              9,
              40
            ]
          },
          {
            "slug": "beer-budweiser",
            "name": "Budweiser",
            "info": null,
            "prices": [
              9,
              40
            ]
          },
          {
            "slug": "beer-heineken",
            "name": "Heineken",
            "info": null,
            "prices": [
              10,
              45
            ]
          },
          {
            "slug": "beer-peroni-nastro-azzurro",
            "name": "Peroni Nastro Azzurro",
            "info": null,
            "prices": [
              10,
              45
            ]
          },
          {
            "slug": "beer-menabrea",
            "name": "Menabrea",
            "info": null,
            "prices": [
              10,
              45
            ]
          },
          {
            "slug": "beer-asahi-super-dry",
            "name": "Asahi Super Dry",
            "info": null,
            "prices": [
              10,
              45
            ]
          },
          {
            "slug": "beer-pilsner-urquell",
            "name": "Pilsner Urquell",
            "info": null,
            "prices": [
              10,
              45
            ]
          },
          {
            "slug": "beer-paulaner-weissbier-500ml",
            "name": "Paulaner Weissbier (500ml)",
            "info": null,
            "prices": [
              13,
              null
            ]
          },
          {
            "slug": "beer-paulaner-dunkel-500ml",
            "name": "Paulaner Dunkel (500ml)",
            "info": null,
            "prices": [
              13,
              null
            ]
          }
        ]
      }
    ]
  },
  {
    "slug": "cocktails",
    "name": "Cocktails",
    "group": "DRINKS",
    "aliases": [],
    "note": null,
    "orderable": false,
    "sections": [
      {
        "slug": "cocktails",
        "title": "Cocktails",
        "sub": null,
        "cols": [
          ""
        ],
        "drinks": [
          {
            "slug": "cocktails-singapore-sling",
            "name": "Singapore Sling",
            "info": "Gin, cherry brandy, Benedictine, bitters, pineapple and lime",
            "prices": [
              18
            ]
          },
          {
            "slug": "cocktails-frozen-margarita",
            "name": "Frozen Margarita",
            "info": "Tequila, lime, triple sec, agave · strawberry, mango or classic",
            "prices": [
              18
            ]
          },
          {
            "slug": "cocktails-mojito",
            "name": "Mojito",
            "info": "White rum, mint, lime and sugar, topped with soda",
            "prices": [
              16
            ]
          },
          {
            "slug": "cocktails-espresso-martini",
            "name": "Espresso Martini",
            "info": "Vodka, Kahlúa, a shot of espresso, coffee beans",
            "prices": [
              14
            ]
          },
          {
            "slug": "cocktails-pina-colada",
            "name": "Piña Colada",
            "info": "Coconut rum, cream of coconut and pineapple",
            "prices": [
              14
            ]
          },
          {
            "slug": "cocktails-dark-and-stormy",
            "name": "Dark & Stormy",
            "info": "Dark rum, lime, candied ginger and ginger beer",
            "prices": [
              14
            ]
          },
          {
            "slug": "cocktails-aperol-spritz",
            "name": "Aperol Spritz",
            "info": "Aperol, prosecco and a dash of soda",
            "prices": [
              12
            ]
          },
          {
            "slug": "cocktails-negroni",
            "name": "Negroni",
            "info": "Gin, vermouth rosso and Campari",
            "prices": [
              12
            ]
          },
          {
            "slug": "cocktails-mai-tai",
            "name": "Mai Tai",
            "info": "Pineapple, fresh lime, triple sec or Cointreau, orgeat",
            "prices": [
              12
            ]
          },
          {
            "slug": "cocktails-cuba-libre",
            "name": "Cuba Libre",
            "info": "White Cuban rum, Coca-Cola and lime",
            "prices": [
              12
            ]
          }
        ]
      }
    ]
  },
  {
    "slug": "wine",
    "name": "Wine",
    "group": "DRINKS",
    "aliases": [],
    "note": null,
    "orderable": false,
    "sections": [
      {
        "slug": "house-pour",
        "title": "House pour",
        "sub": null,
        "cols": [
          "Glass",
          "Bottle"
        ],
        "drinks": [
          {
            "slug": "wine-azueira-bianco",
            "name": "Azueira · Bianco",
            "info": "Portugal · NV · Arinto & Fernão Pires",
            "prices": [
              10,
              48
            ]
          },
          {
            "slug": "wine-azueira-tinto",
            "name": "Azueira · Tinto",
            "info": "Portugal · NV · Castelão & Aragonez",
            "prices": [
              10,
              48
            ]
          },
          {
            "slug": "wine-cava-brut-nature-sparkling",
            "name": "Cava · Brut Nature (sparkling)",
            "info": "DO Cava · NV · Macabeo-Xarel·lo-Parellada",
            "prices": [
              10,
              48
            ]
          },
          {
            "slug": "wine-reguta-di-anselmi-sauvignon-blanc",
            "name": "Reguta di Anselmi · Sauvignon Blanc",
            "info": "Friuli-Venezia Giulia IGT · 2023",
            "prices": [
              12,
              52
            ]
          },
          {
            "slug": "wine-reguta-di-anselmi-cabernet-sauvignon",
            "name": "Reguta di Anselmi · Cabernet Sauvignon",
            "info": "Friuli-Venezia Giulia IGT · 2022",
            "prices": [
              12,
              52
            ]
          }
        ]
      },
      {
        "slug": "italy",
        "title": "Italy",
        "sub": null,
        "cols": [
          "Bottle"
        ],
        "drinks": [
          {
            "slug": "wine-buccia-nera-guarniente",
            "name": "Buccia Nera · “Guarniente”",
            "info": "Red · Chianti DOCG · 2022 · Sangiovese",
            "prices": [
              64
            ]
          },
          {
            "slug": "wine-tuscante-rosso",
            "name": "Tuscante · Rosso",
            "info": "Red · Toscana IGT · 2023 · Sangiovese, Canaiolo & Malvasia Nera",
            "prices": [
              72
            ]
          },
          {
            "slug": "wine-doppio-passo-primitivo",
            "name": "Doppio Passo · Primitivo",
            "info": "Red · Salento IGT · 2023",
            "prices": [
              66
            ]
          },
          {
            "slug": "wine-carlo-pellegrino-tripudium",
            "name": "Carlo Pellegrino · “Tripudium”",
            "info": "Red · Terre Siciliane IGT · 2022 · Nero d’Avola",
            "prices": [
              92
            ]
          },
          {
            "slug": "wine-paolo-e-noemia-d-amico-calanchi-di-vaiano",
            "name": "Paolo e Noemia d’Amico · “Calanchi di Vaiano”",
            "info": "White · Lazio IGP · 2023 · Chardonnay",
            "prices": [
              66
            ]
          },
          {
            "slug": "wine-zardetto-prosecco-treviso-extra-dry",
            "name": "Zardetto · Prosecco Treviso Extra Dry",
            "info": "Sparkling · Treviso DOC · NV · Glera",
            "prices": [
              56
            ]
          }
        ]
      },
      {
        "slug": "spain",
        "title": "Spain",
        "sub": null,
        "cols": [
          "Bottle"
        ],
        "drinks": [
          {
            "slug": "wine-akemi-tinto",
            "name": "Akemi · Tinto",
            "info": "Red · Rioja Oriental DOCa · 2019 · Tempranillo-Garnacha",
            "prices": [
              88
            ]
          },
          {
            "slug": "wine-alicante-bouschet",
            "name": "Alicante Bouschet",
            "info": "Red · Alicante DO · 2018",
            "prices": [
              92
            ]
          },
          {
            "slug": "wine-tarima-mediterraneo",
            "name": "Tarima · Mediterráneo",
            "info": "White · Alicante DO · 2021 · Moscatel & Merseguera",
            "prices": [
              58
            ]
          },
          {
            "slug": "wine-rafael-canizares-sauvignon-blanc",
            "name": "Rafael Cañizares · Sauvignon Blanc",
            "info": "White · Alicante DO · 2021",
            "prices": [
              69
            ]
          }
        ]
      },
      {
        "slug": "france-argentina-north-macedonia",
        "title": "France · Argentina · North Macedonia",
        "sub": null,
        "cols": [
          "Bottle"
        ],
        "drinks": [
          {
            "slug": "wine-chateau-la-chandelliere-cru-bourgeois",
            "name": "Château La Chandellière · Cru Bourgeois",
            "info": "Red · Médoc AOC · 2016 · Cab Sauv, Merlot, Cab Franc",
            "prices": [
              88
            ]
          },
          {
            "slug": "wine-un-mundo-chiquito-malbec",
            "name": "Un Mundo Chiquito · Malbec",
            "info": "Red · Mendoza · 2022",
            "prices": [
              69
            ]
          },
          {
            "slug": "wine-un-mundo-chiquito-cabernet-sauvignon",
            "name": "Un Mundo Chiquito · Cabernet Sauvignon",
            "info": "Red · Uco Valley · 2021",
            "prices": [
              68
            ]
          },
          {
            "slug": "wine-ezimit-vranec",
            "name": "Ezimit · Vranec",
            "info": "Red · Vardar River Valley · 2018",
            "prices": [
              69
            ]
          },
          {
            "slug": "wine-ezimit-viognier",
            "name": "Ezimit · Viognier",
            "info": "White · Vardar River Valley · 2018",
            "prices": [
              69
            ]
          }
        ]
      }
    ]
  },
  {
    "slug": "spirits",
    "name": "Spirits",
    "group": "DRINKS",
    "aliases": [],
    "note": null,
    "orderable": false,
    "sections": [
      {
        "slug": "house-pour",
        "title": "House pour",
        "sub": "Single shot 45ml · neat, on the rocks or with a mixer",
        "cols": [
          "Glass"
        ],
        "drinks": [
          {
            "slug": "spirits-gin-whisky-rum-brandy-vodka-bourbon",
            "name": "Gin · Whisky · Rum · Brandy · Vodka · Bourbon",
            "info": null,
            "prices": [
              10
            ]
          }
        ]
      },
      {
        "slug": "premium-liquors",
        "title": "Premium liquors",
        "sub": null,
        "cols": [
          "Glass",
          "Bottle"
        ],
        "drinks": [
          {
            "slug": "spirits-johnnie-walker-black-12-years",
            "name": "Johnnie Walker Black 12 years",
            "info": "Whisky",
            "prices": [
              12,
              148
            ]
          },
          {
            "slug": "spirits-chivas-regal-12-years",
            "name": "Chivas Regal 12 years",
            "info": "Whisky",
            "prices": [
              12,
              148
            ]
          },
          {
            "slug": "spirits-singleton-single-malt-12-years",
            "name": "Singleton Single Malt 12 years",
            "info": "Whisky",
            "prices": [
              13,
              155
            ]
          },
          {
            "slug": "spirits-glenfiddich-single-malt-12-years",
            "name": "Glenfiddich Single Malt 12 years",
            "info": "Whisky",
            "prices": [
              13,
              155
            ]
          },
          {
            "slug": "spirits-tanqueray",
            "name": "Tanqueray",
            "info": "Gin",
            "prices": [
              12,
              135
            ]
          },
          {
            "slug": "spirits-hendrick-s",
            "name": "Hendrick’s",
            "info": "Gin",
            "prices": [
              15,
              195
            ]
          },
          {
            "slug": "spirits-the-botanist",
            "name": "The Botanist",
            "info": "Gin",
            "prices": [
              14,
              188
            ]
          },
          {
            "slug": "spirits-monkey-47-sloe-gin-50cl",
            "name": "Monkey 47 Sloe Gin (50cl)",
            "info": "Gin",
            "prices": [
              13,
              138
            ]
          },
          {
            "slug": "spirits-martell-vsop",
            "name": "Martell VSOP",
            "info": "Brandy",
            "prices": [
              14,
              188
            ]
          },
          {
            "slug": "spirits-cruzan-dark-rum",
            "name": "Cruzan Dark Rum",
            "info": "Rum",
            "prices": [
              12,
              148
            ]
          },
          {
            "slug": "spirits-sailor-jerry",
            "name": "Sailor Jerry",
            "info": "Rum",
            "prices": [
              14,
              168
            ]
          },
          {
            "slug": "spirits-captain-morgan",
            "name": "Captain Morgan",
            "info": "Rum",
            "prices": [
              13,
              155
            ]
          },
          {
            "slug": "spirits-grey-goose-original",
            "name": "Grey Goose Original",
            "info": "Vodka",
            "prices": [
              15,
              220
            ]
          },
          {
            "slug": "spirits-belvedere",
            "name": "Belvedere",
            "info": "Vodka",
            "prices": [
              14,
              188
            ]
          }
        ]
      }
    ]
  },
  {
    "slug": "softdrinks",
    "name": "Mocktails & Soft Drinks",
    "group": "DRINKS",
    "aliases": [],
    "note": null,
    "orderable": true,
    "sections": [
      {
        "slug": "non-alcoholic-ice-drinks",
        "title": "Non-alcoholic ice drinks",
        "sub": null,
        "cols": [
          ""
        ],
        "drinks": [
          {
            "slug": "softdrinks-virgin-mojito",
            "name": "Virgin Mojito",
            "info": null,
            "prices": [
              8.5
            ]
          },
          {
            "slug": "softdrinks-virgin-pina-colada",
            "name": "Virgin Piña Colada",
            "info": null,
            "prices": [
              8.5
            ]
          },
          {
            "slug": "softdrinks-lychee-tea",
            "name": "Lychee Tea",
            "info": null,
            "prices": [
              7.5
            ]
          },
          {
            "slug": "softdrinks-lemon-lime-mint-soda",
            "name": "Lemon Lime Mint Soda",
            "info": null,
            "prices": [
              6.5
            ]
          },
          {
            "slug": "softdrinks-coke-float",
            "name": "Coke Float",
            "info": null,
            "prices": [
              6.5
            ]
          },
          {
            "slug": "softdrinks-mango-madness",
            "name": "Mango Madness",
            "info": null,
            "prices": [
              6.5
            ]
          },
          {
            "slug": "softdrinks-refreshing-yuzu",
            "name": "Refreshing Yuzu",
            "info": null,
            "prices": [
              6.5
            ]
          },
          {
            "slug": "softdrinks-ginger-ale-spritzer",
            "name": "Ginger Ale Spritzer",
            "info": null,
            "prices": [
              5.5
            ]
          }
        ]
      },
      {
        "slug": "soft-drinks-and-juices",
        "title": "Soft drinks & juices",
        "sub": null,
        "cols": [
          ""
        ],
        "drinks": [
          {
            "slug": "softdrinks-coke-coke-zero-sprite-ice-lemon-tea-ginger-ale-tonic",
            "name": "Coke / Coke Zero / Sprite / Ice Lemon Tea / Ginger Ale / Tonic",
            "info": null,
            "prices": [
              3
            ]
          },
          {
            "slug": "softdrinks-still-and-sparkling-water",
            "name": "Still & Sparkling Water",
            "info": null,
            "prices": [
              4
            ]
          },
          {
            "slug": "softdrinks-chilled-juice",
            "name": "Chilled juice",
            "info": "Apple · Pineapple · Mango · Orange · Cranberry · Lime",
            "prices": [
              4
            ]
          }
        ]
      }
    ]
  },
  {
    "slug": "coffee",
    "name": "Coffee & Tea",
    "group": "DRINKS",
    "aliases": [],
    "note": null,
    "orderable": true,
    "sections": [
      {
        "slug": "coffee",
        "title": "Coffee",
        "sub": null,
        "cols": [
          ""
        ],
        "drinks": [
          {
            "slug": "coffee-double-espresso",
            "name": "Double Espresso",
            "info": null,
            "prices": [
              4.5
            ]
          },
          {
            "slug": "coffee-americano",
            "name": "Americano",
            "info": null,
            "prices": [
              5
            ]
          },
          {
            "slug": "coffee-flat-white",
            "name": "Flat White",
            "info": null,
            "prices": [
              5.5
            ]
          },
          {
            "slug": "coffee-cafe-latte",
            "name": "Café Latte",
            "info": null,
            "prices": [
              6
            ]
          },
          {
            "slug": "coffee-cappuccino",
            "name": "Cappuccino",
            "info": null,
            "prices": [
              6
            ]
          },
          {
            "slug": "coffee-cafe-mocha",
            "name": "Café Mocha",
            "info": null,
            "prices": [
              6.5
            ]
          },
          {
            "slug": "coffee-caramel-macchiato",
            "name": "Caramel Macchiato",
            "info": null,
            "prices": [
              6.5
            ]
          },
          {
            "slug": "coffee-hazelnut-latte",
            "name": "Hazelnut Latte",
            "info": null,
            "prices": [
              6.5
            ]
          },
          {
            "slug": "coffee-caramel-latte",
            "name": "Caramel Latte",
            "info": null,
            "prices": [
              6.5
            ]
          }
        ]
      },
      {
        "slug": "chocolate-and-hot-tea",
        "title": "Chocolate & hot tea",
        "sub": null,
        "cols": [
          ""
        ],
        "drinks": [
          {
            "slug": "coffee-hot-chocolate",
            "name": "Hot Chocolate",
            "info": null,
            "prices": [
              5.5
            ]
          },
          {
            "slug": "coffee-iced-chocolate",
            "name": "Iced Chocolate",
            "info": null,
            "prices": [
              6
            ]
          },
          {
            "slug": "coffee-hot-tea",
            "name": "Hot tea",
            "info": "Matcha · Chamomile · Earl Grey · English Breakfast · Peppermint",
            "prices": [
              3.5
            ]
          }
        ]
      }
    ]
  }
];
