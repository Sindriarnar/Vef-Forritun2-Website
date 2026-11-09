/* Curated, illustrative content for the local concept. No live offers are fetched. */
window.CONCEPT_DATA = {
  categories: [
    { id: 'all', label: 'Allt' },
    { id: 'matur', label: 'Matur & drykkur' },
    { id: 'tonlist', label: 'Tónlist' },
    { id: 'afthreying', label: 'Afþreying' },
    { id: 'utivera', label: 'Útivera' }
  ],
  offers: [
    {
      id: 'burger', title: 'Góður borgari. Gott kvöld.',
      subtitle: 'Borgari, franskar og gos — allt í einum pakka.',
      category: 'matur', categoryLabel: 'Matur & drykkur',
      description: 'Stundum þarf planið ekki að vera flókið. Fáðu þér safaríkan ostborgara, stökkar franskar og ískalt gos í góðum félagsskap. Veldu tímann sem hentar og settu kvöldið á planið.',
      place: 'Borgarabarinn', address: 'Laugavegur, Reykjavík',
      price: 1990, originalPrice: 3980, discount: 50,
      image: 'assets/burger.jpg', imageAlt: 'Safaríkur ostborgari með fersku grænmeti',
      times: ['12:00', '17:00', '18:00', '19:00', '20:00'], dayOffset: 0,
      tag: 'Tilboð dagsins', duration: '60 mín.', x: 58, y: 57
    },
    {
      id: 'pizza', title: 'Tvær pítsur. Eitt gott plan.',
      subtitle: 'Deildu nýbakaðri pítsu með þínum uppáhaldsmanneskjum.',
      category: 'matur', categoryLabel: 'Matur & drykkur',
      description: 'Steinbakaður botn, góð hráefni og engin þörf á að elda. Veldu tvær pítsur af matseðli og njóttu rólegrar kvöldstundar í miðbænum. Tilboðið er hugsað fyrir tvo.',
      place: 'Hornpítsan', address: 'Skólavörðustígur, Reykjavík',
      price: 3490, originalPrice: 4985, discount: 30,
      image: 'assets/pizza.jpg', imageAlt: 'Nýbökuð pítsa með tómötum og fersku basilíku',
      times: ['16:00', '17:30', '19:00', '20:30'], dayOffset: 0,
      tag: 'Gott fyrir tvo', duration: '90 mín.', x: 48, y: 64
    },
    {
      id: 'cinema', title: 'Stóra tjaldið bíður.', fixedDate: true,
      subtitle: 'Slökktu á símanum og sökktu þér í góða sögu.',
      category: 'afthreying', categoryLabel: 'Afþreying',
      description: 'Notaleg kvikmyndastund í rauðu sætunum. Veldu sýningartíma og láttu kvöldið snúast um góða sögu. Þetta sýnidæmi inniheldur einn aðgöngumiða; val á kvikmynd færi fram hjá bíóinu.',
      place: 'Bæjarbíó', address: 'Hverfisgata, Reykjavík',
      price: 1490, originalPrice: 1990, discount: 25,
      image: 'assets/cinema.jpg', imageAlt: 'Kvikmyndasalur með rauðum sætum og stóru tjaldi',
      times: ['18:00', '20:30'], dayOffset: 1,
      tag: 'Bíókvöld', duration: '2 klst.', x: 66, y: 45
    },
    {
      id: 'concert', title: 'Kvöldið á sinn hljóm.', fixedDate: true,
      subtitle: 'Lifandi tónlist, góð stemning og nýjar minningar.',
      category: 'tonlist', categoryLabel: 'Tónlist',
      description: 'Taktu vin með á litla tónleika í hjarta borgarinnar. Dyrnar opna hálftíma fyrir upphaf og tónlistin fær að njóta sín fram eftir kvöldi. Viðburðurinn og flytjendur eru hluti af sýnigögnum hugmyndarinnar.',
      place: 'Hljómur', address: 'Tryggvagata, Reykjavík',
      price: 2900, originalPrice: null, discount: null,
      image: 'assets/concert.jpg', imageAlt: 'Hlý sviðsljós og áhorfendur á tónleikum',
      times: ['20:00', '21:30'], dayOffset: 0,
      tag: 'Lifandi tónlist', duration: '2 klst.', x: 35, y: 41
    },
    {
      id: 'pool', title: 'Láttu líða úr þér.',
      subtitle: 'Hlýtt vatn, ferskt loft og smá stund fyrir þig.',
      category: 'afthreying', categoryLabel: 'Afþreying',
      description: 'Skiptu dagsins önn út fyrir rólega stund í heitu vatni. Sýnidæmið inniheldur aðgang að laug og heitum pottum. Taktu með sundföt og handklæði og leyfðu þér að hægja aðeins á.',
      place: 'Hlýja laug', address: 'Vesturbær, Reykjavík',
      price: 1390, originalPrice: null, discount: null,
      image: 'assets/pool.svg', imageAlt: 'Myndskreyting af hlýrri laug í íslensku kvöldlandslagi',
      times: ['09:00', '12:00', '17:00', '19:00'], dayOffset: 1,
      tag: 'Smá sjálfsrækt', duration: '90 mín.', x: 19, y: 63
    },
    {
      id: 'walk', title: 'Borgin er betri fótgangandi.', schedule: 'weekend',
      subtitle: 'Ganga við sjóinn og nýtt sjónarhorn á Reykjavík.',
      category: 'utivera', categoryLabel: 'Útivera',
      description: 'Góð ganga þarf hvorki miða né stórt tilefni. Byrjaðu við gömlu höfnina og fylgdu sjávarsíðunni í rólegheitum. Þetta er tillaga að sjálfstæðri göngu, án leiðsögumanns. Klæddu þig eftir veðri.',
      place: 'Sjávarsíðan', address: 'Gamla höfnin, Reykjavík',
      price: 0, originalPrice: null, discount: null,
      image: 'assets/walk.svg', imageAlt: 'Myndskreyting af gönguleið við sjávarsíðuna í Reykjavík',
      times: ['10:00', '13:00', '16:00'], dayOffset: 5,
      tag: 'Kostar ekkert', duration: '60 mín.', x: 40, y: 28
    },
    {
      id: 'jazz', title: 'Jazz, spjall og seinni sopinn.', schedule: 'weekend', fixedDate: true,
      subtitle: 'Lítill salur. Mjúkir tónar. Stórgott kvöld.',
      category: 'tonlist', categoryLabel: 'Tónlist',
      description: 'Finndu þér gott sæti og hlustaðu á lifandi jazz í afslöppuðu andrúmslofti. Tilvalið fyrir kvöld þar sem þú vilt gera eitthvað sérstakt án þess að flækja planið. Drykkir eru keyptir sér.',
      place: 'Litla sviðið', address: 'Austurstræti, Reykjavík',
      price: 1900, originalPrice: 2500, discount: 24,
      image: 'assets/concert.jpg', imageAlt: 'Sviðsljós lýsa upp notalega tónleikastemningu',
      times: ['19:30', '21:00'], dayOffset: 5,
      tag: 'Helgarplan', duration: '90 mín.', x: 43, y: 50
    },
    {
      id: 'brunch', title: 'Byrjum daginn aðeins betur.', schedule: 'weekend',
      subtitle: 'Hægur morgunn með góðum bröns og kaffibolla.',
      category: 'matur', categoryLabel: 'Matur & drykkur',
      description: 'Gefðu morgninum aðeins meiri tíma. Njóttu brönsplatta með eggjum, fersku brauði og grænmeti ásamt kaffi eða tei. Gott plan með vini eða einfaldlega góð bók og þú.',
      place: 'Morgunstund', address: 'Frakkastígur, Reykjavík',
      price: 2990, originalPrice: 3990, discount: 25,
      image: 'assets/brunch.svg', imageAlt: 'Myndskreyting af brönsplatta og kaffibolla á sólríku borði',
      times: ['10:00', '11:00', '12:00'], dayOffset: 5,
      tag: 'Hægur morgunn', duration: '90 mín.', x: 72, y: 63
    }
  ]
};
