// ═══════════════════════════════════════════════════════════════════════════
//  BOSS DATA
//  Structure: list of areas in order. isDLC separates Base Game / DLC.
//  Progress (defeated, deaths, pinned, date, level) is NOT stored here,
//  but per user in localStorage (see script.js).
//  Boss names are English (the primary key for UI, localStorage and the OCR
//  detector). German names live in window.BOSS_ALIASES at the bottom, keyed
//  by the English name, purely so the OCR detector also recognizes a German
//  game client.
// ═══════════════════════════════════════════════════════════════════════════

window.BOSS_DATA = [
  {
    "area": "Limgrave",
    "isDLC": false,
    "bosses": [
      "Black Knife Assassin",
      "Ulcerated Tree Spirit",
      "Tree Sentinel",
      "Beastman of Farum Azula",
      "Bloodhound Knight Darriwil",
      "Night's Cavalry",
      "Flying Dragon Agheel",
      "Godrick the Grafted",
      "Grave Warden Duelist",
      "Demi-Human Chief",
      "Bell Bearing Hunter",
      "Margit, the Fell Omen",
      "Patches",
      "Crucible Knight",
      "Soldier of Godrick",
      "Stonedigger Troll",
      "Tibia Mariner",
      "Deathbird",
      "Grafted Scion",
      "Erdtree Burial Watchdog",
      "Guardian Golem",
      "Mad Pumpkin Head"
    ]
  },
  {
    "area": "Halbinsel der Tränen",
    "isDLC": false,
    "bosses": [
      "Erdtree Avatar",
      "Night's Cavalry",
      "Cemetery Shade",
      "Leonine Misbegotten",
      "Miranda the Blighted Bloom",
      "Runebear",
      "Scaly Misbegotten",
      "Deathbird",
      "Ancient Hero of Zamor",
      "Erdtree Burial Watchdog"
    ]
  },
  {
    "area": "Liurnia",
    "isDLC": false,
    "bosses": [
      "Adan, Thief of Fire",
      "Alecto, Black Knife Ringleader",
      "Black Knife Assassin",
      "Erdtree Avatar (Northeast)",
      "Erdtree Avatar (Southwest)",
      "Bloodhound Knight",
      "Bols, Carian Knight",
      "Night's Cavalry (South)",
      "Night's Cavalry (North)",
      "Cemetery Shade",
      "Spirit-Caller Snail",
      "Glintstone Dragon Adula",
      "Glintstone Dragon Smarag",
      "Bell Bearing Hunter",
      "Royal Knight Loretta",
      "Royal Revenant",
      "Crystalian (Ringblade)",
      "Crystalian (Spear) & Crystalian (Staff)",
      "Magma Wyrm Makar",
      "Omenkiller",
      "Onyx Lord",
      "Cleanrot Knight",
      "Rennala, Queen of the Full Moon",
      "Red Wolf of Radagon",
      "Tibia Mariner",
      "Death Rite Bird",
      "Deathbird",
      "Erdtree Burial Watchdog"
    ]
  },
  {
    "area": "Caelid",
    "isDLC": false,
    "bosses": [
      "Godskin Apostle",
      "Beastman of Farum Azula",
      "Night's Cavalry (Northeast)",
      "Night's Cavalry (South)",
      "Crystalian (Rotted)",
      "Flying Dragon Greyll",
      "Cemetery Shade",
      "Bell Bearing Hunter",
      "Commander O'Neil",
      "Battlemage Hugues",
      "Magma Wyrm",
      "Nox Swordstress & Nox Monk",
      "Frenzied Duelist",
      "Cleanrot Knight",
      "Crucible Knight & Misbegotten Warrior",
      "Fallingstar Beast",
      "Starscourge Radahn",
      "Putrid Avatar (East)",
      "Putrid Avatar (West)",
      "Putrid Tree Spirit",
      "Death Rite Bird",
      "Black Blade Kindred",
      "Decaying Ekzykes",
      "Erdtree Burial Watchdog",
      "Mad Pumpkin Head (Duo)"
    ]
  },
  {
    "area": "Altus Plateau",
    "isDLC": false,
    "bosses": [
      "Godskin Apostle",
      "Black Knife Assassin (Sage's Cave)",
      "Black Knife Assassin (Sainted Hero's Grave)",
      "Tree Sentinel Duo",
      "Bloodhound Knight",
      "Night's Cavalry",
      "Elemer of the Briar",
      "Godefroy the Grafted",
      "Demi-Human Queen Gilika",
      "Crystalian (Spear) & Crystalian (Ringblade)",
      "Omenkiller & Miranda the Blighted Bloom",
      "Necromancer Garris",
      "Perfumer Tricia & Misbegotten Warrior",
      "Stonedigger Troll",
      "Fallingstar Beast",
      "Tibia Mariner",
      "Ancient Dragon Lansseax",
      "Ancient Hero of Zamor",
      "Erdtree Burial Watchdog",
      "Wormface"
    ]
  },
  {
    "area": "Berg Gelmir",
    "isDLC": false,
    "bosses": [
      "Godskin Noble",
      "Full-Grown Fallingstar Beast",
      "Ulcerated Tree Spirit",
      "Abductor Virgins",
      "God-Devouring Serpent / Rykard, Lord of Blasphemy",
      "Demi-Human Queen Maggie",
      "Demi-Human Queen Margot",
      "Red Wolf of the Champion",
      "Magma Wyrm",
      "Kindred of Rot"
    ]
  },
  {
    "area": "Leyndell, Royale Hauptstadt",
    "isDLC": false,
    "bosses": [
      "Draconic Tree Sentinel",
      "Esgar, Priest of Blood",
      "Godfrey, First Elden Lord",
      "Grave Warden Duelist",
      "Fell Twins",
      "Bell Bearing Hunter",
      "Mohg, the Omen",
      "Morgott, the Omen King",
      "Onyx Lord",
      "Crucible Knight & Crucible Knight Ordovis",
      "Deathbird"
    ]
  },
  {
    "area": "Berggipfel der Riesen",
    "isDLC": false,
    "bosses": [
      "Godskin Apostle & Godskin Noble",
      "Erdtree Avatar",
      "Ulcerated Tree Spirit",
      "Borealis, the Freezing Fog",
      "Fire Giant",
      "Commander Niall",
      "Death Rite Bird",
      "Ancient Hero of Zamor",
      "Vyke, Knight of the Round Table Hold"
    ]
  },
  {
    "area": "Siofra",
    "isDLC": false,
    "bosses": [
      "Ancestor Spirit",
      "Dragonkin Soldier",
      "Mohg, Lord of Blood"
    ]
  },
  {
    "area": "Ainsel",
    "isDLC": false,
    "bosses": [
      "Dragonkin Soldier of Nokstella"
    ]
  },
  {
    "area": "Zerfallendes Farum Azula",
    "isDLC": false,
    "bosses": [
      "Beast Clergyman / Maliketh, the Black Blade",
      "Dragonlord Placidusax",
      "Godskin Duo"
    ]
  },
  {
    "area": "Verbotene Lande",
    "isDLC": false,
    "bosses": [
      "Night's Cavalry",
      "Black Blade Kindred"
    ]
  },
  {
    "area": "Nokron, Ewige Stadt",
    "isDLC": false,
    "bosses": [
      "Mimic Tear",
      "Regal Ancestor Spirit",
      "Valiant Gargoyle & Valiant Gargoyle (Twinblade)"
    ]
  },
  {
    "area": "Tiefenwurzel-Tiefen",
    "isDLC": false,
    "bosses": [
      "Fia's Champions",
      "Lichdragon Fortissax",
      "Crucible Knight Siluria"
    ]
  },
  {
    "area": "Fäulnissee",
    "isDLC": false,
    "bosses": [
      "Astel, Naturalborn of the Void",
      "Dragonkin Soldier"
    ]
  },
  {
    "area": "Geweihtes Schneefeld",
    "isDLC": false,
    "bosses": [
      "Astel, Stars of Darkness",
      "Night's Cavalry (Duo)",
      "Great Wyrm Theodorix",
      "Misbegotten Crusader",
      "Putrid Avatar",
      "Putrid Grave Warden Duelist",
      "Death Rite Bird",
      "Stray Mimic Tear"
    ]
  },
  {
    "area": "Haligbaum",
    "isDLC": false,
    "bosses": [
      "Loretta, Knight of the Haligtree",
      "Malenia, Blade of Miquella"
    ]
  },
  {
    "area": "Leyndell, Aschene Hauptstadt",
    "isDLC": false,
    "bosses": [
      "Hoarah Loux, Warrior",
      "Sir Gideon Ofnir, the All-Knowing"
    ]
  },
  {
    "area": "Eldenthron",
    "isDLC": false,
    "bosses": [
      "Radagon of the Golden Order / Elden Beast"
    ]
  },
  {
    "area": "Gravesite Plain",
    "isDLC": true,
    "bosses": [
      "Chief Bloodfiend",
      "Ghostflame Dragon",
      "Divine Beast Dancing Lion",
      "Demi-Human Swordmaster Onze",
      "Rellana, Twin Moon Knight",
      "Blackgaol Knight",
      "Red Bear"
    ]
  },
  {
    "area": "Scadu Altus",
    "isDLC": true,
    "bosses": [
      "Curseblade Labirith",
      "Count Ymir, Mother of Fingers",
      "Ghostflame Dragon",
      "Golden Hippopotamus",
      "Jori, Elder Inquisitor",
      "Messmer the Impaler + Base Serpent Messmer",
      "Metyr, Mother of Fingers",
      "Rakshasa",
      "Ralva, the Great Red Bear",
      "Black Knight Edredd",
      "Black Knight Garrew",
      "Death Knight",
      "Dryleaf Dane"
    ]
  },
  {
    "area": "Rauh Base",
    "isDLC": true,
    "bosses": [
      "Rugalea, the Great Red Bear",
      "Death Knight"
    ]
  },
  {
    "area": "Cerulean Coast",
    "isDLC": true,
    "bosses": [
      "Putrescent Knight",
      "Ghostflame Dragon",
      "Demi-Human Queen Marigga",
      "Dancer of Ranah"
    ]
  },
  {
    "area": "Charo's Hidden Grave",
    "isDLC": true,
    "bosses": [
      "Lamenter",
      "Death Rite Bird"
    ]
  },
  {
    "area": "Jagged Peak",
    "isDLC": true,
    "bosses": [
      "Bayle the Dread",
      "Jagged Peak Drake",
      "Jagged Peak Drake",
      "Ancient Dragon Senessax",
      "Ancient Dragon-Man"
    ]
  },
  {
    "area": "Abyssal Woods",
    "isDLC": true,
    "bosses": [
      "Midra, Lord of Frenzied Flame"
    ]
  },
  {
    "area": "Scaduview",
    "isDLC": true,
    "bosses": [
      "Scadutree Avatar",
      "Tree Sentinel",
      "Tree Sentinel",
      "Commander Gaius",
      "Fallingstar Beast"
    ]
  },
  {
    "area": "Ancient Ruins of Rauh",
    "isDLC": true,
    "bosses": [
      "Divine Beast Dancing Lion",
      "Romina, Saint of the Bud"
    ]
  },
  {
    "area": "Enir-Ilim",
    "isDLC": true,
    "bosses": [
      "Promised Consort Radahn + Radahn, Consort of Miquella"
    ]
  }
];

// Story / demigod "main" bosses (highlighted in the tracker and overlay).
// Kept here so the tracker and the overlay share one list.
window.MAIN_BOSSES = [
  "Margit, the Fell Omen",
  "Godrick the Grafted",
  "Rennala, Queen of the Full Moon",
  "Red Wolf of Radagon",
  "Starscourge Radahn",
  "God-Devouring Serpent / Rykard, Lord of Blasphemy",
  "Draconic Tree Sentinel",
  "Godfrey, First Elden Lord",
  "Morgott, the Omen King",
  "Mohg, Lord of Blood",
  "Fire Giant",
  "Beast Clergyman / Maliketh, the Black Blade",
  "Godskin Duo",
  "Malenia, Blade of Miquella",
  "Hoarah Loux, Warrior",
  "Sir Gideon Ofnir, the All-Knowing",
  "Radagon of the Golden Order / Elden Beast",
  "Rellana, Twin Moon Knight",
  "Divine Beast Dancing Lion",
  "Messmer the Impaler + Base Serpent Messmer",
  "Bayle the Dread",
  "Midra, Lord of Frenzied Flame",
  "Commander Gaius",
  "Romina, Saint of the Bud",
  "Promised Consort Radahn + Radahn, Consort of Miquella",
];

// German boss-name aliases, keyed by the canonical English name above.
// Used only by the OCR death detector (backend/death_detector/death_detector.py)
// so it also recognizes boss health-bar names when the game runs in German —
// the frontend UI and localStorage progress keys stay English-only.
window.BOSS_ALIASES = {
  "Black Knife Assassin": ["Assasine der Schwarzen Klinge"],
  "Ulcerated Tree Spirit": ["Baumgeist mit Geschwüren"],
  "Tree Sentinel": ["Baumwächter"],
  "Beastman of Farum Azula": ["Bestienmensch von Farum Azula"],
  "Bloodhound Knight Darriwil": ["Bluthundritter Darriwil"],
  "Night's Cavalry": ["Dunkelkavallerist"],
  "Flying Dragon Agheel": ["Fliegender Drache Agheel"],
  "Godrick the Grafted": ["Godrick der Verpflanzte"],
  "Grave Warden Duelist": ["Grabhüterduellant"],
  "Demi-Human Chief": ["Halbmenschen-Herrscher"],
  "Bell Bearing Hunter": ["Klangperlenjäger"],
  "Margit, the Fell Omen": ["Margit, das Grausame Mal"],
  "Crucible Knight": ["Schmelztiegelritter"],
  "Soldier of Godrick": ["Soldat Godricks"],
  "Stonedigger Troll": ["Steingräbertroll"],
  "Tibia Mariner": ["Tibiaseefahrer"],
  "Deathbird": ["Todesvogel"],
  "Grafted Scion": ["Verpflanzter Spross"],
  "Erdtree Burial Watchdog": ["Wachhund des Erdenbaumbegräbnisses"],
  "Guardian Golem": ["Wächtergolem"],
  "Mad Pumpkin Head": ["Wahnsinniger Kürbiskopf"],
  "Erdtree Avatar": ["Avatar des Erdenbaums"],
  "Cemetery Shade": ["Friedhofsschemen"],
  "Leonine Misbegotten": ["Löwenartiges Scheusal"],
  "Miranda the Blighted Bloom": ["Miranda die faulige Blume"],
  "Runebear": ["Runenbär"],
  "Scaly Misbegotten": ["Schuppenscheusal"],
  "Ancient Hero of Zamor": ["Uralter Held von Zamor"],
  "Adan, Thief of Fire": ["Adan, Dieb des Feuers"],
  "Alecto, Black Knife Ringleader": ["Alecto, Oberhaupt der Schwarzen Klingen"],
  "Erdtree Avatar (Northeast)": ["Avatar des Erdenbaums (Nordosten)"],
  "Erdtree Avatar (Southwest)": ["Avatar des Erdenbaums (Südwesten)"],
  "Bloodhound Knight": ["Bluthundritter", "Blutadliger"],
  "Bols, Carian Knight": ["Bols, Carianischer Ritter"],
  "Night's Cavalry (South)": ["Dunkelkavallerist Süden"],
  "Night's Cavalry (North)": ["Dunkelkavallerist Norden"],
  "Spirit-Caller Snail": ["Geisterruferschnecke"],
  "Glintstone Dragon Adula": ["Glimmersteindrache Adula"],
  "Glintstone Dragon Smarag": ["Glimmersteindrache Smarag"],
  "Royal Knight Loretta": ["Königliche Ritterin Loretta"],
  "Royal Revenant": ["Königliches Gespenst"],
  "Crystalian (Ringblade)": ["Kristalliner mit Ringklinge"],
  "Crystalian (Spear) & Crystalian (Staff)": ["Kristalliner mit Speer & Kristalliner mit Stab"],
  "Magma Wyrm Makar": ["Magmawurm Makar"],
  "Omenkiller": ["Maltöter"],
  "Onyx Lord": ["Onyxfürst"],
  "Cleanrot Knight": ["Reinfäule-Ritter"],
  "Rennala, Queen of the Full Moon": ["Rennala, Königin des Vollmonds"],
  "Red Wolf of Radagon": ["Roter Wolf von Radagon"],
  "Death Rite Bird": ["Todesritenvogel"],
  "Godskin Apostle": ["Apostel der Götterskalpe"],
  "Night's Cavalry (Northeast)": ["Dunkelkavallerist Nordost"],
  "Crystalian (Rotted)": ["Faulige Kristallianer"],
  "Flying Dragon Greyll": ["Fliegender Drache Greyll"],
  "Commander O'Neil": ["Kommandant O'Neil"],
  "Battlemage Hugues": ["Kriegsmagier Hugues"],
  "Magma Wyrm": ["Magmalindwurm"],
  "Nox Swordstress & Nox Monk": ["Nox Schwertmaid & Nox Mönch"],
  "Frenzied Duelist": ["Rasender Duellant"],
  "Crucible Knight & Misbegotten Warrior": ["Schmelztiegelritter & Löwenartiges Scheusal"],
  "Fallingstar Beast": ["Sternenfallbestie"],
  "Starscourge Radahn": ["Sternengeißel Radahn"],
  "Putrid Avatar (East)": ["Stinkender Avatar Osten"],
  "Putrid Avatar (West)": ["Stinkender Avatar Westen"],
  "Putrid Tree Spirit": ["Stinkender Baumgeist"],
  "Black Blade Kindred": ["Verehrer der schwarzen Klinge", "Schwarze Klinge Kindred"],
  "Decaying Ekzykes": ["Verfallender Ekzykes"],
  "Mad Pumpkin Head (Duo)": ["Wahnsinnige Kürbisköpfe"],
  "Black Knife Assassin (Sage's Cave)": ["Assassine der Schwarzen Klinge (Sage's Cave)"],
  "Black Knife Assassin (Sainted Hero's Grave)": ["Assassine der Schwarzen Klinge (Sainted Hero's Grave)"],
  "Tree Sentinel Duo": ["Baumwächter Duo"],
  "Elemer of the Briar": ["Elemer von den Dornen"],
  "Godefroy the Grafted": ["Godefroy der Verpflanzte"],
  "Demi-Human Queen Gilika": ["Halbmenschliche Königin Gilika"],
  "Crystalian (Spear) & Crystalian (Ringblade)": ["Kristalliner mit Speer & Kristalliner mit Ringklinge"],
  "Omenkiller & Miranda the Blighted Bloom": ["Maltöter & Miranda die faulige Blume"],
  "Necromancer Garris": ["Nekromant Garris"],
  "Perfumer Tricia & Misbegotten Warrior": ["Parfümeurin Tricia & Löwenartiges Scheusal"],
  "Ancient Dragon Lansseax": ["Uralter Drache Lansseax"],
  "Wormface": ["Wurmgesicht"],
  "Godskin Noble": ["Adliger der Götterskalpe"],
  "Full-Grown Fallingstar Beast": ["Ausgewachsene Sternenfallbestie"],
  "Abductor Virgins": ["Entführer-Jungfrauen"],
  "God-Devouring Serpent / Rykard, Lord of Blasphemy": ["Götterverschlingende Schlange / Rykard, Fürst der Blasphemie"],
  "Demi-Human Queen Maggie": ["Halbmenschliche Königin Maggie"],
  "Demi-Human Queen Margot": ["Halbmenschliche Königin Margot"],
  "Red Wolf of the Champion": ["Heldenhafter Roter Wolf"],
  "Kindred of Rot": ["Spross der Fäulnis"],
  "Draconic Tree Sentinel": ["Drachenbaumwächter"],
  "Esgar, Priest of Blood": ["Esgar, Priester des Blutes"],
  "Godfrey, First Elden Lord": ["Godfrey, Erster Eldenfürst"],
  "Fell Twins": ["Grausame Zwillinge"],
  "Mohg, the Omen": ["Mohg, das Omen"],
  "Morgott, the Omen King": ["Morgott, König des Mals"],
  "Crucible Knight & Crucible Knight Ordovis": ["Schmelztiegelritter & Schmelztiegelritter Ordovis"],
  "Godskin Apostle & Godskin Noble": ["Apostel der Götterskalpe & Adliger der Götterskalpe"],
  "Borealis, the Freezing Fog": ["Borealis der eisige Nebel"],
  "Fire Giant": ["Feuerriese"],
  "Commander Niall": ["Kommandant Niall"],
  "Vyke, Knight of the Round Table Hold": ["Vyke, Ritter der Tafelrundfeste"],
  "Ancestor Spirit": ["Ahnengeist"],
  "Dragonkin Soldier": ["Drachenblutsoldat"],
  "Mohg, Lord of Blood": ["Mohg, Fürst des Blutes"],
  "Dragonkin Soldier of Nokstella": ["Drachenblutsoldat von Nokstella"],
  "Beast Clergyman / Maliketh, the Black Blade": ["Bestienkleriker / Maliketh, die Schwarze Klinge"],
  "Dragonlord Placidusax": ["Drachenlord Placidusax"],
  "Godskin Duo": ["Duo der Götterskalpe"],
  "Mimic Tear": ["Imitatorträne"],
  "Regal Ancestor Spirit": ["Königlicher Ahnengeist"],
  "Valiant Gargoyle & Valiant Gargoyle (Twinblade)": ["Tapferer Gargoyle & Tapferer Gargoyle (Zwillingsklinge)"],
  "Lichdragon Fortissax": ["Lichdrache Fortissax"],
  "Crucible Knight Siluria": ["Schmelztiegelritter Siluria"],
  "Astel, Naturalborn of the Void": ["Astel, Ausgeburt des Abgrunds"],
  "Astel, Stars of Darkness": ["Astel, Sterne der Finsternis"],
  "Night's Cavalry (Duo)": ["Dunkelkavallerist (Duo)"],
  "Great Wyrm Theodorix": ["Großer Lindwurm Theodorix"],
  "Misbegotten Crusader": ["Kreuzfahrerscheusal"],
  "Putrid Avatar": ["Stinkender Avatar"],
  "Putrid Grave Warden Duelist": ["Stinkender Grabhüterduellant"],
  "Stray Mimic Tear": ["Verirrte Imitatorträne"],
  "Loretta, Knight of the Haligtree": ["Loretta, Ritterin des Haligbaums"],
  "Malenia, Blade of Miquella": ["Malenia, Klinge von Miquella"],
  "Hoarah Loux, Warrior": ["Godfrey, Erster Eldenfürst (Hoarah Loux)"],
  "Sir Gideon Ofnir, the All-Knowing": ["Sir Gideon Ofnir, der Allwissende"],
  "Radagon of the Golden Order / Elden Beast": ["Radagon von der Goldenen Ordnung / Eldenbestie"],
  "Chief Bloodfiend": ["Blutunhold-Anführer"],
  "Ghostflame Dragon": ["Geisterflammendrache"],
  "Divine Beast Dancing Lion": ["Göttliche Bestie - Tanzender Löwe"],
  "Demi-Human Swordmaster Onze": ["Halbmenschen-Schwertmeister Onze"],
  "Rellana, Twin Moon Knight": ["Rellana, Zwillings-Mondritterin"],
  "Blackgaol Knight": ["Ritter des Einsamen Kerkers"],
  "Red Bear": ["Roter Bär"],
  "Curseblade Labirith": ["Fluchklingen Labirith"],
  "Count Ymir, Mother of Fingers": ["Fürst Ymir, Mutter der Finger"],
  "Golden Hippopotamus": ["Goldenes Nilpferd"],
  "Jori, Elder Inquisitor": ["Jori, Ältester Inquisitor"],
  "Messmer the Impaler + Base Serpent Messmer": ["Messmer der Pfähler + Böse Schlange Messmer"],
  "Metyr, Mother of Fingers": ["Metyr, Mutter der Finger"],
  "Ralva, the Great Red Bear": ["Ralva der große rote Bär"],
  "Black Knight Edredd": ["Schwarzer Ritter Edredd"],
  "Black Knight Garrew": ["Schwarzer Ritter Garrew"],
  "Death Knight": ["Todesritter"],
  "Dryleaf Dane": ["Trockenblatt Dane"],
  "Rugalea, the Great Red Bear": ["Rugalea der große rote Bär"],
  "Putrescent Knight": ["Fäulnisritter"],
  "Demi-Human Queen Marigga": ["Halbmenschen-Königin Marigga"],
  "Dancer of Ranah": ["Tänzerin von Ranah"],
  "Lamenter": ["Kläger"],
  "Bayle the Dread": ["Bayle der Schreckliche"],
  "Jagged Peak Drake": ["Klingengipfel-Drachling"],
  "Ancient Dragon Senessax": ["Uralter Drache Senessax"],
  "Ancient Dragon-Man": ["Uralter Drachenmensch"],
  "Midra, Lord of Frenzied Flame": ["Midra, Herr der Rasenden Flamme"],
  "Scadutree Avatar": ["Avatar des Scadubaums"],
  "Commander Gaius": ["Kommandant Gaius"],
  "Romina, Saint of the Bud": ["Romina, Heilige der Knospe"],
  "Promised Consort Radahn + Radahn, Consort of Miquella": ["Radahn, versprochener Gemahl + Radahn, Miquellas Gemahl"]
};
