// ═══════════════════════════════════════════════════════════════════════════
//  BOSS DATA
//  Structure: list of areas in order. isDLC separates Base Game / DLC.
//  Progress (defeated, deaths, pinned, date, level) is NOT stored here,
//  but per user in localStorage (see script.js).
// ═══════════════════════════════════════════════════════════════════════════

window.BOSS_DATA = [
  {
    "area": "Limgrave",
    "isDLC": false,
    "bosses": [
      "Assasine der Schwarzen Klinge",
      "Baumgeist mit Geschwüren",
      "Baumwächter",
      "Bestienmensch von Farum Azula",
      "Bluthundritter Darriwil",
      "Dunkelkavallerist",
      "Fliegender Drache Agheel",
      "Godrick der Verpflanzte",
      "Grabhüterduellant",
      "Halbmenschen-Herrscher",
      "Klangperlenjäger",
      "Margit, das Grausame Mal",
      "Patches",
      "Schmelztiegelritter",
      "Soldat Godricks",
      "Steingräbertroll",
      "Tibiaseefahrer",
      "Todesvogel",
      "Verpflanzter Spross",
      "Wachhund des Erdenbaumbegräbnisses",
      "Wächtergolem",
      "Wahnsinniger Kürbiskopf"
    ]
  },
  {
    "area": "Halbinsel der Tränen",
    "isDLC": false,
    "bosses": [
      "Avatar des Erdenbaums",
      "Dunkelkavallerist",
      "Friedhofsschemen",
      "Löwenartiges Scheusal",
      "Miranda die faulige Blume",
      "Runenbär",
      "Schuppenscheusal",
      "Todesvogel",
      "Uralter Held von Zamor",
      "Wachhund des Erdenbaumbegräbnisses"
    ]
  },
  {
    "area": "Liurnia",
    "isDLC": false,
    "bosses": [
      "Adan, Dieb des Feuers",
      "Alecto, Oberhaupt der Schwarzen Klingen",
      "Assasine der Schwarzen Klinge",
      "Avatar des Erdenbaums (Nordosten)",
      "Avatar des Erdenbaums (Südwesten)",
      "Bluthundritter",
      "Bols, Carianischer Ritter",
      "Dunkelkavallerist Süden",
      "Dunkelkavallerist Norden",
      "Friedhofsschemen",
      "Geisterruferschnecke",
      "Glimmersteindrache Adula",
      "Glimmersteindrache Smarag",
      "Klangperlenjäger",
      "Königliche Ritterin Loretta",
      "Königliches Gespenst",
      "Kristalliner mit Ringklinge",
      "Kristalliner mit Speer & Kristalliner mit Stab",
      "Magmawurm Makar",
      "Maltöter",
      "Onyxfürst",
      "Reinfäule-Ritter",
      "Rennala, Königin des Vollmonds",
      "Roter Wolf von Radagon",
      "Tibiaseefahrer",
      "Todesritenvogel",
      "Todesvogel",
      "Wachhund des Erdenbaumbegräbnisses"
    ]
  },
  {
    "area": "Caelid",
    "isDLC": false,
    "bosses": [
      "Apostel der Götterskalpe",
      "Bestienmensch von Farum Azula",
      "Dunkelkavallerist Nordost",
      "Dunkelkavallerist Süden",
      "Faulige Kristallianer",
      "Fauliger Baumgeist",
      "Fliegender Drache Greyll",
      "Friedhofsschemen",
      "Klangperlenjäger",
      "Kommandant O'Neil",
      "Kriegsmagier Hugues",
      "Magmalindwurm",
      "Nox Schwertmaid & Nox Mönch",
      "Rasender Duellant",
      "Reinfäule-Ritter",
      "Schmelztiegelritter & Löwenartiges Scheusal",
      "Sternenfallbestie",
      "Sternengeißel Radahn",
      "Stinkender Avatar Osten",
      "Stinkender Avatar Westen",
      "Todesritenvogel",
      "Verehrer der schwarzen Klinge",
      "Verfallender Ekzykes",
      "Wachhund des Erdenbaumbegräbnisses",
      "Wahnsinnige Kürbisköpfe"
    ]
  },
  {
    "area": "Altus Plateau",
    "isDLC": false,
    "bosses": [
      "Apostel der Götterskalpe",
      "Assassine der Schwarzen Klinge (Sage's Cave)",
      "Assassine der Schwarzen Klinge (Sainted Hero's Grave)",
      "Baumwächter Duo",
      "Blutadliger",
      "Dunkelkavallerist",
      "Elemer von den Dornen",
      "Godefroy der Verpflanzte",
      "Halbmenschliche Königin Gilika",
      "Kristalliner mit Speer & Kristalliner mit Ringklinge",
      "Maltöter & Miranda die faulige Blume",
      "Nekromant Garris",
      "Parfümeurin Tricia & Löwenartiges Scheusal",
      "Steingräbertroll",
      "Sternenfallbestie",
      "Tibiaseefahrer",
      "Uralter Drache Lansseax",
      "Uralter Held von Zamor",
      "Wachhund des Erdenbaumbegräbnisses",
      "Wurmgesicht"
    ]
  },
  {
    "area": "Berg Gelmir",
    "isDLC": false,
    "bosses": [
      "Adliger der Götterskalpe",
      "Ausgewachsene Sternenfallbestie",
      "Baumgeist mit Geschwüren",
      "Entführer-Jungfrauen",
      "Götterverschlingende Schlange / Rykard, Fürst der Blasphemie",
      "Halbmenschliche Königin Maggie",
      "Halbmenschliche Königin Margot",
      "Heldenhafter Roter Wolf",
      "Magmalindwurm",
      "Spross der Fäulnis"
    ]
  },
  {
    "area": "Leyndell, Royale Hauptstadt",
    "isDLC": false,
    "bosses": [
      "Drachenbaumwächter",
      "Esgar, Priester des Blutes",
      "Godfrey, Erster Eldenfürst",
      "Grabhüterduellant",
      "Grausame Zwillinge",
      "Klangperlenjäger",
      "Mohg, das Omen",
      "Morgott, König des Mals",
      "Onyxfürst",
      "Schmelztiegelritter & Schmelztiegelritter Ordovis",
      "Todesvogel"
    ]
  },
  {
    "area": "Berggipfel der Riesen",
    "isDLC": false,
    "bosses": [
      "Apostel der Götterskalpe & Adliger der Götterskalpe",
      "Avatar des Erdenbaums",
      "Baumgeist mit Geschwüren",
      "Borealis der eisige Nebel",
      "Feuerriese",
      "Kommandant Niall",
      "Todesritenvogel",
      "Uralter Held von Zamor",
      "Vyke, Ritter der Tafelrundfeste"
    ]
  },
  {
    "area": "Siofra",
    "isDLC": false,
    "bosses": [
      "Ahnengeist",
      "Drachenblutsoldat",
      "Mohg, Fürst des Blutes"
    ]
  },
  {
    "area": "Ainsel",
    "isDLC": false,
    "bosses": [
      "Drachenblutsoldat von Nokstella"
    ]
  },
  {
    "area": "Zerfallendes Farum Azula",
    "isDLC": false,
    "bosses": [
      "Bestienkleriker / Maliketh, die Schwarze Klinge",
      "Drachenlord Placidusax",
      "Duo der Götterskalpe"
    ]
  },
  {
    "area": "Verbotene Lande",
    "isDLC": false,
    "bosses": [
      "Dunkelkavallerist",
      "Schwarze Klinge Kindred"
    ]
  },
  {
    "area": "Nokron, Ewige Stadt",
    "isDLC": false,
    "bosses": [
      "Imitatorträne",
      "Königlicher Ahnengeist",
      "Tapferer Gargoyle & Tapferer Gargoyle (Zwillingsklinge)"
    ]
  },
  {
    "area": "Tiefenwurzel-Tiefen",
    "isDLC": false,
    "bosses": [
      "Fia's Champions",
      "Lichdrache Fortissax",
      "Schmelztiegelritter Siluria"
    ]
  },
  {
    "area": "Fäulnissee",
    "isDLC": false,
    "bosses": [
      "Astel, Ausgeburt des Abgrunds",
      "Drachenblutsoldat"
    ]
  },
  {
    "area": "Geweihtes Schneefeld",
    "isDLC": false,
    "bosses": [
      "Astel, Sterne der Finsternis",
      "Dunkelkavallerist (Duo)",
      "Großer Lindwurm Theodorix",
      "Kreuzfahrerscheusal",
      "Stinkender Avatar",
      "Stinkender Grabhüterduellant",
      "Todesritenvogel",
      "Verirrte Imitatorträne"
    ]
  },
  {
    "area": "Haligbaum",
    "isDLC": false,
    "bosses": [
      "Loretta, Ritterin des Haligbaums",
      "Malenia, Klinge von Miquella"
    ]
  },
  {
    "area": "Leyndell, Aschene Hauptstadt",
    "isDLC": false,
    "bosses": [
      "Godfrey, Erster Eldenfürst (Hoarah Loux)",
      "Sir Gideon Ofnir, der Allwissende"
    ]
  },
  {
    "area": "Eldenthron",
    "isDLC": false,
    "bosses": [
      "Radagon von der Goldenen Ordnung / Eldenbestie"
    ]
  },
  {
    "area": "Gravesite Plain",
    "isDLC": true,
    "bosses": [
      "Blutunhold-Anführer",
      "Geisterflammendrache",
      "Göttliche Bestie - Tanzender Löwe",
      "Halbmenschen-Schwertmeister Onze",
      "Rellana, Zwillings-Mondritterin",
      "Ritter des Einsamen Kerkers",
      "Roter Bär"
    ]
  },
  {
    "area": "Scadu Altus",
    "isDLC": true,
    "bosses": [
      "Fluchklingen Labirith",
      "Fürst Ymir, Mutter der Finger",
      "Geisterflammendrache",
      "Goldenes Nilpferd",
      "Jori, Ältester Inquisitor",
      "Messmer der Pfähler + Böse Schlange Messmer",
      "Metyr, Mutter der Finger",
      "Rakshasa",
      "Ralva der große rote Bär",
      "Schwarzer Ritter Edredd",
      "Schwarzer Ritter Garrew",
      "Todesritter",
      "Trockenblatt Dane"
    ]
  },
  {
    "area": "Rauh Base",
    "isDLC": true,
    "bosses": [
      "Rugalea der große rote Bär",
      "Todesritter"
    ]
  },
  {
    "area": "Cerulean Coast",
    "isDLC": true,
    "bosses": [
      "Fäulnisritter",
      "Geisterflammendrache",
      "Halbmenschen-Königin Marigga",
      "Tänzerin von Ranah"
    ]
  },
  {
    "area": "Charo's Hidden Grave",
    "isDLC": true,
    "bosses": [
      "Kläger",
      "Todesritenvogel"
    ]
  },
  {
    "area": "Jagged Peak",
    "isDLC": true,
    "bosses": [
      "Bayle der Schreckliche",
      "Klingengipfel-Drachling",
      "Klingengipfel-Drachling",
      "Uralter Drache Senessax",
      "Uralter Drachenmensch"
    ]
  },
  {
    "area": "Abyssal Woods",
    "isDLC": true,
    "bosses": [
      "Midra, Herr der Rasenden Flamme"
    ]
  },
  {
    "area": "Scaduview",
    "isDLC": true,
    "bosses": [
      "Avatar des Scadubaums",
      "Baumwächter",
      "Baumwächter",
      "Kommandant Gaius",
      "Sternenfallbestie"
    ]
  },
  {
    "area": "Ancient Ruins of Rauh",
    "isDLC": true,
    "bosses": [
      "Göttliche Bestie - Tanzender Löwe",
      "Romina, Heilige der Knospe"
    ]
  },
  {
    "area": "Enir-Ilim",
    "isDLC": true,
    "bosses": [
      "Radahn, versprochener Gemahl + Radahn, Miquellas Gemahl"
    ]
  }
];
