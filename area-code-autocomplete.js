// Lightweight autocomplete for US area codes. Targets any
//   <input type="text" data-area-codes>
// element and adds a styled suggestions popover that filters as you type.
// Match: 3-digit prefix OR city/state substring (case-insensitive).
//
// Picking a suggestion sets input.value to the 3-digit code only — keeps the
// existing form-submit logic that expects `/^\d{3}$/`.
(function() {
  'use strict';

  const AREA_CODES = [
    { code: '205', label: 'Birmingham, AL' },
    { code: '251', label: 'Mobile, AL' },
    { code: '334', label: 'Montgomery, AL' },
    { code: '907', label: 'Anchorage, AK' },
    { code: '602', label: 'Phoenix, AZ' },
    { code: '480', label: 'Phoenix metro, AZ' },
    { code: '520', label: 'Tucson, AZ' },
    { code: '623', label: 'Glendale, AZ' },
    { code: '501', label: 'Little Rock, AR' },
    { code: '479', label: 'Fort Smith, AR' },
    { code: '213', label: 'Los Angeles, CA' },
    { code: '310', label: 'West LA / Beverly Hills, CA' },
    { code: '323', label: 'Los Angeles, CA' },
    { code: '408', label: 'San Jose, CA' },
    { code: '415', label: 'San Francisco, CA' },
    { code: '510', label: 'Oakland, CA' },
    { code: '619', label: 'San Diego, CA' },
    { code: '650', label: 'Palo Alto, CA' },
    { code: '714', label: 'Orange County, CA' },
    { code: '805', label: 'Ventura / Santa Barbara, CA' },
    { code: '818', label: 'San Fernando Valley, CA' },
    { code: '858', label: 'San Diego (North), CA' },
    { code: '909', label: 'San Bernardino, CA' },
    { code: '916', label: 'Sacramento, CA' },
    { code: '925', label: 'Concord / Walnut Creek, CA' },
    { code: '949', label: 'Newport Beach, CA' },
    { code: '303', label: 'Denver, CO' },
    { code: '720', label: 'Denver metro, CO' },
    { code: '719', label: 'Colorado Springs, CO' },
    { code: '970', label: 'Fort Collins, CO' },
    { code: '203', label: 'New Haven / Bridgeport, CT' },
    { code: '860', label: 'Hartford, CT' },
    { code: '302', label: 'Wilmington, DE' },
    { code: '202', label: 'Washington, DC' },
    { code: '305', label: 'Miami, FL' },
    { code: '786', label: 'Miami metro, FL' },
    { code: '407', label: 'Orlando, FL' },
    { code: '321', label: 'Orlando / Cocoa, FL' },
    { code: '561', label: 'West Palm Beach, FL' },
    { code: '727', label: 'St. Petersburg, FL' },
    { code: '813', label: 'Tampa, FL' },
    { code: '850', label: 'Tallahassee, FL' },
    { code: '904', label: 'Jacksonville, FL' },
    { code: '941', label: 'Sarasota, FL' },
    { code: '954', label: 'Fort Lauderdale, FL' },
    { code: '404', label: 'Atlanta, GA' },
    { code: '678', label: 'Atlanta metro, GA' },
    { code: '770', label: 'Atlanta suburbs, GA' },
    { code: '912', label: 'Savannah, GA' },
    { code: '478', label: 'Macon, GA' },
    { code: '808', label: 'Honolulu, HI' },
    { code: '208', label: 'Boise, ID' },
    { code: '312', label: 'Chicago, IL' },
    { code: '773', label: 'Chicago, IL' },
    { code: '630', label: 'Chicago west suburbs, IL' },
    { code: '708', label: 'Chicago south suburbs, IL' },
    { code: '847', label: 'Chicago north suburbs, IL' },
    { code: '217', label: 'Springfield, IL' },
    { code: '309', label: 'Peoria, IL' },
    { code: '317', label: 'Indianapolis, IN' },
    { code: '219', label: 'Gary, IN' },
    { code: '260', label: 'Fort Wayne, IN' },
    { code: '812', label: 'Evansville, IN' },
    { code: '515', label: 'Des Moines, IA' },
    { code: '319', label: 'Cedar Rapids, IA' },
    { code: '563', label: 'Davenport, IA' },
    { code: '316', label: 'Wichita, KS' },
    { code: '913', label: 'Kansas City, KS' },
    { code: '785', label: 'Topeka, KS' },
    { code: '502', label: 'Louisville, KY' },
    { code: '859', label: 'Lexington, KY' },
    { code: '270', label: 'Bowling Green, KY' },
    { code: '504', label: 'New Orleans, LA' },
    { code: '225', label: 'Baton Rouge, LA' },
    { code: '318', label: 'Shreveport, LA' },
    { code: '337', label: 'Lafayette, LA' },
    { code: '207', label: 'Portland, ME' },
    { code: '410', label: 'Baltimore, MD' },
    { code: '443', label: 'Baltimore metro, MD' },
    { code: '240', label: 'Frederick, MD' },
    { code: '301', label: 'Bethesda / Rockville, MD' },
    { code: '617', label: 'Boston, MA' },
    { code: '857', label: 'Boston metro, MA' },
    { code: '781', label: 'Boston suburbs, MA' },
    { code: '508', label: 'Worcester, MA' },
    { code: '978', label: 'Lowell, MA' },
    { code: '413', label: 'Springfield, MA' },
    { code: '313', label: 'Detroit, MI' },
    { code: '248', label: 'Oakland County, MI' },
    { code: '734', label: 'Ann Arbor, MI' },
    { code: '616', label: 'Grand Rapids, MI' },
    { code: '517', label: 'Lansing, MI' },
    { code: '586', label: 'Macomb, MI' },
    { code: '810', label: 'Flint, MI' },
    { code: '612', label: 'Minneapolis, MN' },
    { code: '651', label: 'St. Paul, MN' },
    { code: '763', label: 'Minneapolis NW, MN' },
    { code: '952', label: 'Minneapolis SW, MN' },
    { code: '218', label: 'Duluth, MN' },
    { code: '601', label: 'Jackson, MS' },
    { code: '228', label: 'Gulfport, MS' },
    { code: '314', label: 'St. Louis, MO' },
    { code: '816', label: 'Kansas City, MO' },
    { code: '417', label: 'Springfield, MO' },
    { code: '636', label: 'St. Charles, MO' },
    { code: '406', label: 'Billings, MT' },
    { code: '402', label: 'Omaha, NE' },
    { code: '308', label: 'North Platte, NE' },
    { code: '702', label: 'Las Vegas, NV' },
    { code: '725', label: 'Las Vegas metro, NV' },
    { code: '775', label: 'Reno, NV' },
    { code: '603', label: 'Manchester, NH' },
    { code: '201', label: 'Jersey City, NJ' },
    { code: '551', label: 'Jersey City metro, NJ' },
    { code: '732', label: 'Toms River, NJ' },
    { code: '848', label: 'Toms River metro, NJ' },
    { code: '856', label: 'Camden, NJ' },
    { code: '908', label: 'Elizabeth, NJ' },
    { code: '973', label: 'Newark, NJ' },
    { code: '862', label: 'Newark metro, NJ' },
    { code: '609', label: 'Trenton, NJ' },
    { code: '505', label: 'Albuquerque, NM' },
    { code: '575', label: 'Las Cruces, NM' },
    { code: '212', label: 'Manhattan, NY' },
    { code: '332', label: 'Manhattan, NY' },
    { code: '646', label: 'Manhattan, NY' },
    { code: '718', label: 'Brooklyn / Queens / Bronx, NY' },
    { code: '347', label: 'Brooklyn / Queens, NY' },
    { code: '929', label: 'Brooklyn / Queens, NY' },
    { code: '516', label: 'Nassau / Long Island, NY' },
    { code: '631', label: 'Suffolk / Long Island, NY' },
    { code: '914', label: 'Westchester, NY' },
    { code: '845', label: 'Hudson Valley, NY' },
    { code: '585', label: 'Rochester, NY' },
    { code: '716', label: 'Buffalo, NY' },
    { code: '315', label: 'Syracuse, NY' },
    { code: '518', label: 'Albany, NY' },
    { code: '704', label: 'Charlotte, NC' },
    { code: '980', label: 'Charlotte metro, NC' },
    { code: '919', label: 'Raleigh, NC' },
    { code: '984', label: 'Raleigh metro, NC' },
    { code: '336', label: 'Greensboro, NC' },
    { code: '252', label: 'Greenville, NC' },
    { code: '828', label: 'Asheville, NC' },
    { code: '910', label: 'Fayetteville, NC' },
    { code: '701', label: 'Fargo, ND' },
    { code: '216', label: 'Cleveland, OH' },
    { code: '614', label: 'Columbus, OH' },
    { code: '513', label: 'Cincinnati, OH' },
    { code: '419', label: 'Toledo, OH' },
    { code: '330', label: 'Akron, OH' },
    { code: '440', label: 'Cleveland metro, OH' },
    { code: '937', label: 'Dayton, OH' },
    { code: '405', label: 'Oklahoma City, OK' },
    { code: '918', label: 'Tulsa, OK' },
    { code: '580', label: 'Lawton, OK' },
    { code: '503', label: 'Portland, OR' },
    { code: '971', label: 'Portland metro, OR' },
    { code: '541', label: 'Eugene, OR' },
    { code: '215', label: 'Philadelphia, PA' },
    { code: '267', label: 'Philadelphia metro, PA' },
    { code: '412', label: 'Pittsburgh, PA' },
    { code: '724', label: 'Pittsburgh metro, PA' },
    { code: '717', label: 'Harrisburg, PA' },
    { code: '610', label: 'Allentown / Reading, PA' },
    { code: '484', label: 'Allentown metro, PA' },
    { code: '814', label: 'Erie, PA' },
    { code: '570', label: 'Scranton, PA' },
    { code: '401', label: 'Providence, RI' },
    { code: '803', label: 'Columbia, SC' },
    { code: '843', label: 'Charleston, SC' },
    { code: '864', label: 'Greenville, SC' },
    { code: '605', label: 'Sioux Falls, SD' },
    { code: '615', label: 'Nashville, TN' },
    { code: '629', label: 'Nashville metro, TN' },
    { code: '901', label: 'Memphis, TN' },
    { code: '423', label: 'Chattanooga, TN' },
    { code: '865', label: 'Knoxville, TN' },
    { code: '731', label: 'Jackson, TN' },
    { code: '214', label: 'Dallas, TX' },
    { code: '469', label: 'Dallas metro, TX' },
    { code: '972', label: 'Dallas suburbs, TX' },
    { code: '817', label: 'Fort Worth, TX' },
    { code: '682', label: 'Fort Worth metro, TX' },
    { code: '713', label: 'Houston, TX' },
    { code: '281', label: 'Houston metro, TX' },
    { code: '832', label: 'Houston metro, TX' },
    { code: '346', label: 'Houston metro, TX' },
    { code: '512', label: 'Austin, TX' },
    { code: '737', label: 'Austin metro, TX' },
    { code: '210', label: 'San Antonio, TX' },
    { code: '726', label: 'San Antonio metro, TX' },
    { code: '915', label: 'El Paso, TX' },
    { code: '409', label: 'Beaumont, TX' },
    { code: '903', label: 'Tyler, TX' },
    { code: '956', label: 'Brownsville, TX' },
    { code: '801', label: 'Salt Lake City, UT' },
    { code: '385', label: 'Salt Lake metro, UT' },
    { code: '435', label: 'Provo / St. George, UT' },
    { code: '802', label: 'Burlington, VT' },
    { code: '703', label: 'Northern Virginia, VA' },
    { code: '571', label: 'Northern Virginia metro, VA' },
    { code: '804', label: 'Richmond, VA' },
    { code: '757', label: 'Norfolk / Virginia Beach, VA' },
    { code: '540', label: 'Roanoke, VA' },
    { code: '434', label: 'Lynchburg, VA' },
    { code: '206', label: 'Seattle, WA' },
    { code: '425', label: 'Bellevue, WA' },
    { code: '253', label: 'Tacoma, WA' },
    { code: '360', label: 'Olympia, WA' },
    { code: '509', label: 'Spokane, WA' },
    { code: '564', label: 'WA statewide, WA' },
    { code: '304', label: 'Charleston, WV' },
    { code: '414', label: 'Milwaukee, WI' },
    { code: '608', label: 'Madison, WI' },
    { code: '920', label: 'Green Bay, WI' },
    { code: '262', label: 'Kenosha, WI' },
    { code: '715', label: 'Eau Claire, WI' },
    { code: '307', label: 'Cheyenne, WY' },
  ];

  // City aliases per area code so typing a specific city (e.g. "Yorba Linda")
  // surfaces its area code even though the label only names the metro. Extend
  // freely — anything here is folded into the searchable text. (Full nationwide
  // city→areacode coverage would be a dataset; this seeds the high-traffic metros.)
  const CITY_ALIASES = {
    // AL
    '205': 'birmingham hoover tuscaloosa', '251': 'mobile', '334': 'montgomery auburn',
    // AK
    '907': 'anchorage fairbanks juneau',
    // AZ
    '602': 'phoenix', '480': 'scottsdale mesa tempe chandler gilbert', '623': 'glendale peoria surprise goodyear', '520': 'tucson', '928': 'flagstaff yuma',
    // AR
    '501': 'little rock conway', '479': 'fayetteville fort smith bentonville rogers springdale', '870': 'jonesboro',
    // CA
    '213': 'los angeles downtown la', '323': 'los angeles hollywood koreatown', '310': 'santa monica beverly hills malibu inglewood',
    '424': 'santa monica el segundo', '661': 'bakersfield santa clarita valencia palmdale lancaster',
    '714': 'anaheim santa ana yorba linda fullerton orange garden grove buena park placentia brea cypress',
    '657': 'anaheim santa ana orange fullerton', '949': 'irvine newport beach mission viejo laguna costa mesa lake forest huntington beach',
    '562': 'long beach whittier cerritos downey norwalk', '818': 'burbank glendale van nuys north hollywood sherman oaks',
    '747': 'van nuys burbank', '626': 'pasadena alhambra arcadia el monte', '909': 'riverside ontario rancho cucamonga san bernardino fontana',
    '951': 'riverside corona moreno valley temecula murrieta', '760': 'palm springs oceanside escondido victorville',
    '619': 'san diego chula vista national city', '858': 'la jolla san diego', '408': 'san jose santa clara sunnyvale milpitas',
    '650': 'palo alto mountain view redwood city san mateo daly city', '415': 'san francisco', '628': 'san francisco',
    '510': 'oakland berkeley fremont hayward', '916': 'sacramento elk grove roseville', '925': 'walnut creek concord pleasanton antioch',
    '707': 'santa rosa napa vallejo fairfield', '831': 'salinas monterey santa cruz', '805': 'ventura santa barbara oxnard thousand oaks simi valley',
    '559': 'fresno visalia clovis', '209': 'stockton modesto tracy', '530': 'redding chico',
    // CO
    '303': 'denver aurora', '720': 'denver aurora boulder', '719': 'colorado springs pueblo', '970': 'fort collins greeley loveland',
    // CT
    '203': 'new haven bridgeport stamford norwalk', '475': 'new haven bridgeport', '860': 'hartford new britain', '959': 'hartford',
    // DE
    '302': 'wilmington dover newark',
    // DC
    '202': 'washington dc',
    // FL
    '305': 'miami', '786': 'miami hialeah', '954': 'fort lauderdale hollywood pompano', '754': 'fort lauderdale',
    '407': 'orlando kissimmee', '321': 'orlando cocoa melbourne', '561': 'west palm beach boca raton boynton',
    '727': 'st petersburg clearwater', '813': 'tampa brandon', '850': 'tallahassee pensacola panama city',
    '904': 'jacksonville', '941': 'sarasota bradenton fort myers', '239': 'fort myers naples cape coral', '352': 'gainesville ocala',
    '386': 'daytona beach', '772': 'port st lucie stuart',
    // GA
    '404': 'atlanta', '678': 'atlanta sandy springs', '470': 'atlanta', '770': 'marietta alpharetta roswell',
    '912': 'savannah', '478': 'macon', '706': 'augusta columbus athens', '229': 'albany',
    // HI
    '808': 'honolulu hawaii maui kona hilo',
    // ID
    '208': 'boise meridian nampa idaho falls', '986': 'boise',
    // IL
    '312': 'chicago downtown', '773': 'chicago', '872': 'chicago', '630': 'aurora naperville wheaton', '331': 'aurora naperville',
    '708': 'cicero oak lawn', '847': 'evanston schaumburg naperville waukegan', '224': 'schaumburg waukegan',
    '217': 'springfield champaign', '309': 'peoria bloomington', '815': 'rockford joliet', '618': 'east st louis',
    // IN
    '317': 'indianapolis carmel fishers', '463': 'indianapolis', '219': 'gary hammond', '260': 'fort wayne', '812': 'evansville bloomington', '765': 'lafayette muncie',
    // IA
    '515': 'des moines ankeny', '319': 'cedar rapids iowa city', '563': 'davenport dubuque', '712': 'sioux city', '641': 'mason city',
    // KS
    '316': 'wichita', '913': 'kansas city overland park olathe', '785': 'topeka lawrence', '620': 'dodge city',
    // KY
    '502': 'louisville', '859': 'lexington', '270': 'bowling green', '606': 'ashland',
    // LA
    '504': 'new orleans metairie', '225': 'baton rouge', '318': 'shreveport monroe', '337': 'lafayette lake charles', '985': 'houma slidell',
    // ME
    '207': 'portland augusta bangor',
    // MD
    '410': 'baltimore', '443': 'baltimore', '667': 'baltimore', '240': 'frederick germantown', '301': 'bethesda rockville silver spring',
    // MA
    '617': 'boston cambridge', '857': 'boston', '781': 'newton waltham quincy', '508': 'worcester framingham', '774': 'worcester',
    '978': 'lowell lawrence haverhill', '413': 'springfield',
    // MI
    '313': 'detroit dearborn', '248': 'troy southfield novi farmington', '947': 'troy southfield', '734': 'ann arbor canton',
    '616': 'grand rapids', '517': 'lansing', '586': 'warren sterling heights', '810': 'flint', '231': 'traverse city', '906': 'marquette',
    // MN
    '612': 'minneapolis', '651': 'st paul', '763': 'brooklyn park maple grove', '952': 'bloomington edina eden prairie', '218': 'duluth', '507': 'rochester mankato',
    // MS
    '601': 'jackson', '769': 'jackson', '228': 'gulfport biloxi', '662': 'tupelo',
    // MO
    '314': 'st louis', '816': 'kansas city independence', '417': 'springfield joplin', '636': 'st charles ofallon', '573': 'columbia jefferson city', '660': 'sedalia',
    // MT
    '406': 'billings missoula bozeman great falls helena',
    // NE
    '402': 'omaha lincoln', '308': 'north platte grand island', '531': 'omaha',
    // NV
    '702': 'las vegas henderson', '725': 'las vegas', '775': 'reno sparks carson city',
    // NH
    '603': 'manchester nashua concord',
    // NJ
    '201': 'jersey city hackensack', '551': 'jersey city', '732': 'toms river edison new brunswick', '848': 'toms river edison',
    '856': 'camden cherry hill', '908': 'elizabeth plainfield', '973': 'newark paterson clifton', '862': 'newark', '609': 'trenton atlantic city',
    // NM
    '505': 'albuquerque santa fe rio rancho', '575': 'las cruces roswell',
    // NY
    '212': 'manhattan nyc new york', '332': 'manhattan', '646': 'manhattan', '718': 'brooklyn queens bronx staten island',
    '347': 'brooklyn queens', '929': 'brooklyn queens', '516': 'long island nassau hempstead', '631': 'long island suffolk',
    '914': 'westchester yonkers white plains', '845': 'hudson valley poughkeepsie newburgh', '585': 'rochester', '716': 'buffalo niagara',
    '315': 'syracuse utica', '518': 'albany schenectady troy', '607': 'binghamton ithaca',
    // NC
    '704': 'charlotte', '980': 'charlotte', '919': 'raleigh durham cary', '984': 'raleigh durham', '336': 'greensboro winston salem high point',
    '252': 'greenville rocky mount', '828': 'asheville', '910': 'fayetteville wilmington',
    // ND
    '701': 'fargo bismarck grand forks',
    // OH
    '216': 'cleveland', '614': 'columbus', '380': 'columbus', '513': 'cincinnati', '419': 'toledo', '567': 'toledo',
    '330': 'akron canton', '234': 'akron canton', '440': 'cleveland lorain', '937': 'dayton', '740': 'athens zanesville',
    // OK
    '405': 'oklahoma city norman edmond', '918': 'tulsa', '580': 'lawton',
    // OR
    '503': 'portland salem', '971': 'portland', '541': 'eugene medford bend', '458': 'eugene',
    // PA
    '215': 'philadelphia', '267': 'philadelphia', '445': 'philadelphia', '412': 'pittsburgh', '724': 'pittsburgh',
    '717': 'harrisburg lancaster york', '610': 'allentown reading', '484': 'allentown', '814': 'erie altoona', '570': 'scranton wilkes barre',
    // RI
    '401': 'providence warwick cranston',
    // SC
    '803': 'columbia rock hill', '843': 'charleston myrtle beach', '864': 'greenville spartanburg', '854': 'charleston',
    // SD
    '605': 'sioux falls rapid city',
    // TN
    '615': 'nashville franklin murfreesboro', '629': 'nashville', '901': 'memphis', '423': 'chattanooga johnson city',
    '865': 'knoxville', '731': 'jackson', '931': 'clarksville',
    // TX
    '214': 'dallas', '469': 'dallas plano frisco mckinney', '972': 'dallas irving garland mesquite', '817': 'fort worth arlington', '682': 'fort worth arlington',
    '713': 'houston', '281': 'houston sugar land katy', '832': 'houston', '346': 'houston', '512': 'austin round rock', '737': 'austin',
    '210': 'san antonio', '726': 'san antonio', '915': 'el paso', '409': 'beaumont galveston', '903': 'tyler longview',
    '956': 'brownsville mcallen laredo', '361': 'corpus christi', '254': 'killeen waco temple', '936': 'conroe huntsville', '430': 'tyler longview',
    // UT
    '801': 'salt lake city west valley sandy ogden', '385': 'salt lake city', '435': 'provo orem st george logan',
    // VT
    '802': 'burlington montpelier',
    // VA
    '703': 'arlington alexandria fairfax', '571': 'arlington alexandria fairfax', '804': 'richmond', '757': 'norfolk virginia beach chesapeake newport news',
    '540': 'roanoke fredericksburg harrisonburg', '434': 'lynchburg charlottesville',
    // WA
    '206': 'seattle', '425': 'bellevue redmond kirkland everett', '253': 'tacoma kent federal way', '360': 'olympia bellingham vancouver',
    '509': 'spokane yakima', '564': 'seattle tacoma',
    // WV
    '304': 'charleston huntington morgantown', '681': 'charleston',
    // WI
    '414': 'milwaukee', '262': 'kenosha racine waukesha', '608': 'madison', '920': 'green bay appleton oshkosh', '715': 'eau claire wausau',
    // WY
    '307': 'cheyenne casper jackson laramie',
  };
  // Pre-lower the search field for fast filtering (code + label + city aliases).
  AREA_CODES.forEach((r) => { r._search = (r.code + ' ' + r.label + ' ' + (CITY_ALIASES[r.code] || '')).toLowerCase(); });
  const MAX_SUGGESTIONS = 8;

  function filterAreaCodes(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return AREA_CODES.slice(0, MAX_SUGGESTIONS);
    // Numeric query: prefix-match the code first.
    if (/^\d+$/.test(q)) {
      const prefix = AREA_CODES.filter((r) => r.code.startsWith(q));
      // De-dup by code so a multi-name area code (e.g. 213) only shows once.
      const seen = new Set();
      const out = [];
      for (const r of prefix) {
        if (seen.has(r.code)) continue;
        seen.add(r.code);
        out.push(r);
        if (out.length >= MAX_SUGGESTIONS) break;
      }
      return out;
    }
    // Text query: substring match against label or code.
    return AREA_CODES.filter((r) => r._search.includes(q)).slice(0, MAX_SUGGESTIONS);
  }

  function attachAutocomplete(input) {
    if (input.dataset.acAttached === '1') return;
    input.dataset.acAttached = '1';
    input.setAttribute('autocomplete', 'off');
    if (!input.getAttribute('placeholder')) input.setAttribute('placeholder', 'e.g. 415 or "Austin"');
    input.setAttribute('inputmode', 'text');
    if (!input.maxLength || input.maxLength <= 0) input.maxLength = 30;

    // Wrap the input so we can position the menu absolutely under it.
    const wrap = document.createElement('div');
    wrap.className = 'area-code-ac';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const menu = document.createElement('div');
    menu.className = 'custom-dropdown-menu-list area-code-ac-menu';
    // position:fixed + appended to <body> so NO ancestor with overflow (e.g. a
    // modal that's overflow-y:auto) can clip the dropdown — it was getting cut
    // off inside the activate modal. Positioned under the input by positionMenu().
    menu.style.position = 'fixed';
    menu.style.zIndex = '9999';
    menu.style.maxHeight = '260px';
    menu.style.padding = '4px';
    wrap.style.position = 'relative';
    document.body.appendChild(menu);
    function positionMenu() {
      const r = input.getBoundingClientRect();
      menu.style.left = r.left + 'px';
      menu.style.top = (r.bottom + 4) + 'px';
      menu.style.width = r.width + 'px';
    }
    window.addEventListener('scroll', function () { if (menu.classList.contains('open')) positionMenu(); }, true);
    window.addEventListener('resize', function () { if (menu.classList.contains('open')) positionMenu(); });

    let activeIdx = -1;
    let lastResults = [];

    function render(results) {
      lastResults = results;
      activeIdx = -1;
      positionMenu();
      if (!results.length) {
        menu.innerHTML = '<div class="area-code-ac-empty" style="padding:10px 12px;color:#94A3B8;font-size:0.85rem;">No matches. Type a 3-digit area code or a city name.</div>';
        menu.classList.add('open');
        return;
      }
      menu.innerHTML = results.map((r, i) =>
        '<div class="custom-dropdown-option area-code-ac-option" data-code="' + r.code + '" data-i="' + i + '">' +
          '<span style="font-weight:700;color:#0F172A;font-variant-numeric:tabular-nums;min-width:34px;">' + r.code + '</span>' +
          '<span style="color:#64748B;flex:1;margin-left:10px;">' + r.label + '</span>' +
        '</div>'
      ).join('');
      menu.classList.add('open');
    }

    function pick(code) {
      input.value = code;
      menu.classList.remove('open');
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function setActive(idx) {
      const items = menu.querySelectorAll('.area-code-ac-option');
      items.forEach((el) => el.classList.remove('selected'));
      if (idx >= 0 && idx < items.length) {
        items[idx].classList.add('selected');
        items[idx].scrollIntoView({ block: 'nearest' });
      }
      activeIdx = idx;
    }

    input.addEventListener('input', () => {
      const v = input.value;
      // If the user typed only digits and crossed 3 chars, hard-clip — the
      // form expects exactly 3.
      if (/^\d{4,}$/.test(v)) input.value = v.slice(0, 3);
      render(filterAreaCodes(input.value));
    });
    // Intentionally do NOT open on a cold focus/click — only show suggestions
    // while the user is actually typing (the 'input' handler above). Avoids the
    // click-to-open-then-vanish flicker and the menu covering the field before
    // anything is typed. Re-show on focus only if there's already a query.
    input.addEventListener('focus', () => { if ((input.value || '').trim()) render(filterAreaCodes(input.value)); });
    input.addEventListener('keydown', (e) => {
      if (!menu.classList.contains('open')) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIdx + 1, lastResults.length - 1)); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(Math.max(activeIdx - 1, 0)); }
      else if (e.key === 'Enter') {
        // Pick the highlighted item, or fall back to the first/only suggestion —
        // so the user can just type and press Enter without arrowing down first.
        var idx = activeIdx >= 0 ? activeIdx : 0;
        if (lastResults[idx]) { e.preventDefault(); pick(lastResults[idx].code); }
      } else if (e.key === 'Escape') { menu.classList.remove('open'); }
    });
    // Hide on outside click. Delay slightly so option clicks register first.
    document.addEventListener('mousedown', (e) => {
      if (!wrap.contains(e.target) && !menu.contains(e.target)) menu.classList.remove('open');
    });
    menu.addEventListener('mousedown', (e) => {
      // Mousedown (not click) — fires before the input's blur. Prevents the
      // menu from disappearing under our finger before pick() runs.
      const opt = e.target.closest('.area-code-ac-option');
      if (!opt) return;
      e.preventDefault();
      pick(opt.dataset.code);
    });
  }

  function scan(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('input[data-area-codes]:not([data-ac-attached="1"])').forEach(attachAutocomplete);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scan());
  } else {
    scan();
  }
  // Re-scan when modals open or new content lands. Debounced via rAF.
  let pending = false;
  const obs = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; scan(); });
  });
  obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  window.attachAreaCodeAutocomplete = attachAutocomplete;
  // Validator so callers can reject made-up area codes (e.g. 111) before
  // "Ready to activate". True only for a real, known US/CA area code.
  window.isValidAreaCode = function (code) {
    var c = String(code || '').replace(/\D/g, '');
    return c.length === 3 && AREA_CODES.some(function (r) { return r.code === c; });
  };
})();
