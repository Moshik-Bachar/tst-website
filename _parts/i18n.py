# -*- coding: utf-8 -*-
"""
Translation table for the TST site.

The Hebrew HTML parts are the single source of truth. The build produces the
English page (default, LTR) by replacing every Hebrew string below with its
English counterpart, longest strings first so that short words never clip a
sentence that contains them. Any Hebrew character left in the English output
fails the build, so a missing entry can't ship unnoticed.
"""
import re

HE_EN = {
    # ---- head / meta --------------------------------------------------------
    "TST · The Squadron Technology — מאמני טיסה ומרכזי אימון": "TST · The Squadron Technology — Flight Simulators and Training Centers",
    "TST מתכננת, מקימה, מפתחת ומפעילה מאמני טיסה ומרכזי אימון לחילות אוויר ולגופי הכשרה. שמונה שנות הפעלה, מאות אלפי גיחות אימון ו-99.7% זמינות.":
        "TST designs, builds, develops and operates flight simulators and training centers for air forces and training organizations. Eight years of operation, hundreds of thousands of training sorties and 99.7% availability.",
    "TST · מאמני טיסה ומרכזי אימון": "TST · Flight Simulators and Training Centers",
    "ניסיון מבצעי + טכנולוגיה מתקדמת + אמינות מוכחת = מוכנות למשימה. מערך אימון שלם מספק אחד, לאורך כל חייו.":
        "Operational experience + advanced technology + proven reliability = mission readiness. A complete training system from a single supplier, for its entire life cycle.",
    "מערך אימון שלם מספק אחד: תכנון, הקמה, פיתוח המאמן, הפעלה ואחזקה, הדרכה.":
        "A complete training system from one supplier: planning, construction, simulator development, operation and maintenance, instruction.",
    "תכנון, הקמה, פיתוח, הפעלה והדרכה של מאמני טיסה ומרכזי אימון לחילות אוויר ולגופי הכשרה.":
        "Planning, construction, development, operation and instruction for flight simulators and training centers serving air forces and training organizations.",
    "מערך אימון שלם מספק אחד": "A complete training system from a single supplier",
    "שלבי המערך": "System phases",
    "דילוג לתוכן הראשי": "Skip to main content",
    "מד גובה: ניווט בין חלקי העמוד": "Altimeter: navigate between page sections",

    # ---- navigation ---------------------------------------------------------
    "TST — The Squadron Technology, לדף הבית": "TST — The Squadron Technology, home",
    "ניווט ראשי": "Main navigation",
    "ניווט נייד": "Mobile navigation",
    "ניווט תחתון": "Footer navigation",
    "פתיחת תפריט": "Open menu",
    "שפה": "Language",
    "סגירת תפריט": "Close menu",
    "המאמנים שלנו": "Our Trainers",
    "הפתרון": "Solution",
    "טכנולוגיה": "Technology",
    "זמינות": "Availability",
    "הצוות": "Team",
    "צרו קשר": "Contact",
    "תיאום הדגמה": "Book a demo",
    "דואר אלקטרוני": "Email",
    "טלפון": "Phone",

    # ---- hero ---------------------------------------------------------------
    "מאמני טיסה ומרכזי אימון": "Flight simulators and training centers",
    "ניסיון מבצעי": "Operational experience",
    "טכנולוגיה מתקדמת": "Advanced technology",
    "אמינות מוכחת": "Proven reliability",
    "מוכנות למשימה.": "Mission readiness.",
    "שמונה שנים של פיתוח, הקמה והפעלה של מאמני טיסה, ומאות אלפי גיחות אימון מאחורינו. עכשיו אנחנו מביאים את הניסיון הזה לחילות אוויר ולגופי הכשרה בישראל ובעולם.":
        "Eight years of developing, building and operating flight simulators, with hundreds of thousands of training sorties behind us. Now we bring that experience to air forces and training organizations in Israel and worldwide.",
    "ניסיון תפעולי": "Operational record",
    "מאות אלפי גיחות": "Hundreds of thousands of sorties",
    "מי שהובילו את חיל האוויר": "Those who led the Air Force",
    "שמונה שנים": "Eight years",
    "ניסיון": "Experience",
    "הנהגה": "Leadership",
    "גלילה לתוכן": "Scroll to content",
    "גלילה": "Scroll",

    # ---- ticker -------------------------------------------------------------
    "מאות אלפי גיחות אימון": "Hundreds of thousands of training sorties",
    "מציאות מדומה ומעורבת": "Virtual and mixed reality",
    "שמונה שנות הפעלה": "Eight years of operation",
    "99.7% זמינות": "99.7% availability",
    "מאמני טיסה": "Flight simulators",
    "מרכזי אימון": "Training centers",

    # ---- solution -----------------------------------------------------------
    "אצלנו הטכנולוגיה וההדרכה הן חלק מאותה מערכת.": "With us, technology and instruction are part of the same system.",
    "מערך אימון שלם מספק אחד, לאורך כל חייו. בלי פערים בין מי שבונה, מי שמתחזק ומי שמדריך, ובלי הפתעות ביום שבו הטייס נכנס לתא.":
        "A complete training system from a single supplier, for its entire life cycle. No gaps between those who build, those who maintain and those who instruct, and no surprises on the day the pilot steps into the cockpit.",
    "תכנון אדריכלי ותפקודי של מרכז האימון לפי הדרישה ההדרכתית.": "Architectural and functional planning of the training center to the instructional requirement.",
    "הקמת סביבת האימון ושילוב מערכות מחשוב ותקשורת, בעמידה בדרישות התקינה.": "Building the training environment and integrating computing and communications systems in compliance with regulatory requirements.",
    "מאמן מותאם לכלי הטיס ולתצורה הייחודית של הלקוח.": "A simulator tailored to the aircraft and to the customer's unique configuration.",
    "ניהול תצורה, אחזקה ותמיכה תפעולית לאורך כל חיי המערכת.": "Configuration management, maintenance and operational support throughout the system's life.",
    "תפיסות הדרכה ומדריכים בכירים, מרמת הטייס הבודד ועד הצוות.": "Training concepts and senior instructors, from the individual pilot to the crew.",
    "פיתוח המאמן": "Simulator development",
    "הפעלה ואחזקה": "Operation and maintenance",
    "תכנון": "Planning",
    "הקמה": "Construction",
    "הדרכה": "Instruction",
    "אופציה": "Optional",
    "מתוכנית מרכז האימון ועד הרגע שבו הטייס נכנס לתא.": "From the training-center plan to the moment the pilot steps into the cockpit.",
    "כל מרכז מתוכנן סביב תוכנית ההדרכה: מספר העמדות, מיקום המדריך והזרימה בין תדריך, אימון ותחקיר.":
        "Every center is planned around the training program: the number of stations, the instructor's position, and the flow between briefing, training and debriefing.",
    "מהתכנון ועד תא הטייס": "From the plan to the cockpit",
    "זרימת האימון": "Training flow",
    "תדריך": "Briefing",
    "אימון": "Training",
    "תחקיר": "Debrief",

    # ---- trainers -----------------------------------------------------------
    "שני מאמנים למטוסי ההדרכה של חיל האוויר הישראלי.": "Two simulators for the Israeli Air Force's training aircraft.",
    "פיתחנו מאמן לכל אחד ממטוסי ההדרכה של בית הספר לטיסה, ועמדנו בדרישות של אחד הלקוחות התובעניים בעולם. אותה פלטפורמה מוכנה להתאמה לכל כלי טיס ולכל לקוח.":
        "We developed a simulator for each of the flight school's training aircraft and met the requirements of one of the most demanding customers in the world. The same platform is ready to be adapted to any aircraft and any customer.",
    "מאמן למטוס ההדרכה הבסיסי, שבו כל טייס מתחיל את דרכו.": "A simulator for the basic trainer aircraft, where every pilot begins.",
    "מאמן למטוס ההדרכה של מסלול התובלה והמודיעין, עם תא טייס בתצורה הישראלית, מערכת תצוגה היקפית ועמדת מדריך.":
        "A simulator for the transport and intelligence track trainer, with an Israeli-configuration cockpit, a surround visual display and an instructor station.",
    "התאמת הפלטפורמה למטוס קרב: תא טייס נאמן למקור, שילוב המערכות הייחודיות של הלקוח ומודל טיסה מדויק.":
        "The platform adapted to a fighter: a high-fidelity cockpit, integration of the customer's unique systems and an accurate flight model.",
    "אימון בתצורה המבצעית המלאה: מערכת תצוגה היקפית, מציאות מעורבת ועמדת מדריך, בהתאמה לתצורת הלקוח.":
        "Training in the full operational configuration: surround visual display, mixed reality and an instructor station, adapted to the customer's configuration.",
    "ממטוסי הדרכה ועד מטוסי קרב: אותה פלטפורמה, אותה עמדת מדריך, בתצורה של הלקוח.": "From trainers to fighters: the same platform and the same instructor station, in the customer's configuration.",
    "מטוס הדרכה בסיסי": "Basic trainer aircraft",
    "מטוס תובלה ומודיעין": "Transport and intelligence aircraft",
    "מטוס קרב רב-משימתי": "Multirole fighter",
    "מטוס קרב דור חמישי": "Fifth-generation fighter",
    "מטוסי קרב": "Fighter aircraft",
    "מאמן Grob G-120": "Grob G-120 Trainer",
    "מאמן Beechcraft Bonanza": "Beechcraft Bonanza Trainer",
    "מאמן F-16": "F-16 Trainer",
    "מאמן F-35": "F-35 Trainer",
    "מה כל מאמן כולל": "What every trainer includes",
    "תא טייס נאמן למקור, מותאם לתצורה של הלקוח.": "A high-fidelity cockpit, matched to the customer's configuration.",
    "שילוב מלא של חומרה ותוכנה.": "Full integration of hardware and software.",
    "מודל טיסה מדויק.": "An accurate flight model.",
    "עמדת מדריך וכלי תחקיר בפיתוח עצמי.": "In-house instructor station and debriefing tools.",
    "תכנון תא הטייס": "Cockpit design",
    "סריקה תלת-ממדית של המטוס": "3D scan of the aircraft",

    # ---- technology ---------------------------------------------------------
    "פלטפורמה בפיתוח עצמי, מהארכיטקטורה ועד עמדת המדריך.": "An in-house platform, from the architecture to the instructor station.",
    "אנחנו מפתחים בעצמנו את ליבת המערכת, ולכן יכולים לשנות, להרחיב ולהתאים.": "We develop the system's core ourselves, so we can change, extend and adapt it.",
    "מערכות תצוגה, בקרים, מחשוב ותקשורת משתלבים יחד במאמן אחד, מותאם לכל כלי טיס, ממטוסי הדרכה ועד מטוסי קרב.":
        "Display systems, controls, computing and communications come together in one simulator, adapted to any aircraft, from trainers to fighters.",
    "אנחנו יודעים לשלב במאמן את המערכות הייחודיות של הלקוח, כך שהאימון משקף את התצורה המבצעית המלאה.":
        "We integrate the customer's unique systems into the simulator, so training reflects the full operational configuration.",
    "תא טייס פיזי לצד עולם מדומה, כחלופה או כהשלמה למאמן קלאסי, לפי צורכי המשימה.":
        "A physical cockpit alongside a virtual world, as an alternative or a complement to a classic simulator, according to the mission's needs.",
    "שילוב המערכות הייחודיות של הלקוח": "Integrating the customer's unique systems",
    "שילוב מלא של חומרה ותוכנה": "Full integration of hardware and software",
    "שליטה בכל שכבה": "Control of every layer",
    "כיתת אימון במציאות מעורבת · הדמיה": "Mixed-reality classroom · concept",

    # ---- availability -------------------------------------------------------
    "מאמן טוב נמדד ביום שהוא זמין.": "A good simulator is measured by the day it is available.",
    "אחזקה, ניהול תצורה ותמיכה תפעולית מלאה לאורך כל חיי המערכת.": "Maintenance, configuration management and full operational support throughout the system's life.",
    "מהגיחות המתוכננות יצאו לפועל בלי ביטול בגלל תקלה במערכת.": "of planned sorties flew without a cancellation caused by a system fault.",
    "של מערכות אימון בעומס יומיומי, עם אחזקה ותמיכה בבית.": "of training systems under daily load, with in-house maintenance and support.",
    "שבוצעו על המערכות שלנו.": "flown on our systems.",
    "מאות אלפי": "Hundreds of thousands",
    "גיחות אימון": "Training sorties",
    "שנות הפעלה": "Years of operation",

    # ---- team ---------------------------------------------------------------
    "האנשים שהובילו את חיל האוויר הישראלי מובילים את TST.": "The people who led the Israeli Air Force lead TST.",
    "בהנהלה ובצוות ההדרכה שלנו קצינים בכירים במילואים, בדרגות תת-אלוף ואלוף-משנה, עם מאות שנות ניסיון מצטבר בפיקוד, בהדרכה ובבניין הכוח. לצידם צוות פיתוח שבונה ומפעיל מאמני טיסה כבר שמונה שנים.":
        "Our management and instruction team includes senior reserve officers at the ranks of Brigadier General and Colonel, with hundreds of years of combined experience in command, instruction and force design. Alongside them is a development team that has been building and operating flight simulators for eight years.",
    "שירת בתפקידי פיקוד בכירים בחיל האוויר. מוביל את פיתוח העסקים והאסטרטגיה.": "Served in senior command roles in the Air Force. Leads business development and strategy.",
    "שירת בתפקידי פיקוד והדרכה במערך הטיסה. מוביל את תפיסות ההדרכה.": "Served in command and instruction roles in the flying branch. Leads training concepts.",
    "ניסיון רב בפיתוח מערכות סימולציה ושילוב מערכות. מוביל את פיתוח הפלטפורמה.": "Extensive experience in simulation systems development and systems integration. Leads platform development.",
    "ראשי התיבות והתיאורים הם דוגמה בלבד": "Initials and descriptions are placeholders",
    "אנחנו לא שחקן זר שלומד את השפה. ": "We are not an outsider learning the language. ",
    "חיינו במשך שנים את עולם ההדרכה, התעופה והדרישות המבצעיות.": "We have lived the world of instruction, aviation and operational requirements for years.",
    "תת-אלוף (מיל')": "Brig. Gen. (res.)",
    "אלוף-משנה (מיל')": "Col. (res.)",
    "מנהל טכנולוגיות": "Chief Technology Officer",
    "א.ב.": "A.B.",
    "ג.ד.": "C.D.",
    "ה.ו.": "E.F.",

    # ---- contact ------------------------------------------------------------
    "מתכננים את מערך האימון הבא שלכם? בואו נדבר.": "Planning your next training system? Let's talk.",
    "נשמח להציג לכם הדגמה של הפלטפורמה, אצלכם או אצלנו.": "We'd be glad to demonstrate the platform, at your site or ours.",
    "שילוב בפרויקט קיים": "Integration into an existing project",
    "הדגמת הפלטפורמה": "Platform demonstration",
    "מרכז אימון חדש": "New training center",
    "הפרטים משמשים למענה לפנייה בלבד.": "Your details are used only to respond to your inquiry.",
    "שליחת פנייה": "Send inquiry",
    "נושא הפנייה": "Subject",
    "שם מלא": "Full name",
    "ארגון": "Organization",
    "הודעה": "Message",
    "אחר": "Other",

    # ---- footer / consent ---------------------------------------------------
    "אתר לדוגמה · הפרטים להמחשה בלבד": "Sample site · details for illustration only",
    "חזרה לראש הדף": "Back to top",
    "אנחנו משתמשים ב-Google Analytics כדי להבין איך משתמשים באתר ולשפר אותו. אפשר לאשר או לדחות בכל עת.":
        "We use Google Analytics to understand how the site is used and to improve it. You can accept or decline at any time.",
    "מדידת שימוש באתר": "Site analytics",
    "לא תודה": "No thanks",
    "אישור": "Accept",
}

HEBREW = re.compile(r"[֐-׿]")
BASE = "https://www.example.co.il/"


def to_english(html):
    """Hebrew source page → English page (default, LTR)."""
    for he, en in sorted(HE_EN.items(), key=lambda kv: -len(kv[0])):
        html = html.replace(he, en)
    html = html.replace('<html lang="he" dir="rtl">', '<html lang="en" dir="ltr">')
    html = html.replace('content="he_IL"', 'content="en_US"')
    html = html.replace('"inLanguage": "he-IL"', '"inLanguage": "en"')
    # English mono section codes would duplicate the English eyebrow text
    html = re.sub(r'\s*<span class="eyebrow__en"[^>]*>[^<]*</span>', "", html)
    # language switch: English is current, Hebrew links to /he/
    # explicit file names so the switch also works when the site is opened from the folder (file://)
    html = (html.replace("@@EN_HREF@@", "index.html").replace("@@HE_HREF@@", "he/index.html")
                .replace("@@EN_CUR@@", ' aria-current="page"').replace("@@HE_CUR@@", ""))
    return html


def to_hebrew(html):
    """Hebrew page served from /he/ : relative asset paths and localized URLs."""
    html = re.sub(r'(href|src)="(assets/|site\.webmanifest)', r'\1="../\2', html)
    html = html.replace('<link rel="canonical" href="%s">' % BASE, '<link rel="canonical" href="%she/">' % BASE)
    html = html.replace('<meta property="og:url" content="%s">' % BASE, '<meta property="og:url" content="%she/">' % BASE)
    html = html.replace("assets/img/og-image.png", "assets/img/og-image-he.png")
    html = re.sub(r'("@id": "%s#webpage",\s*"url": ")%s(")' % (re.escape(BASE), re.escape(BASE)), r"\g<1>%she/\g<2>" % BASE, html)
    html = (html.replace("@@EN_HREF@@", "../index.html").replace("@@HE_HREF@@", "index.html")
                .replace("@@EN_CUR@@", "").replace("@@HE_CUR@@", ' aria-current="page"'))
    return html


def hebrew_leaks(html):
    """Hebrew text still present in the English page (the language-switch label is allowed)."""
    stripped = html.replace("עברית", "")
    leaks = set()
    for m in HEBREW.finditer(stripped):
        a, b = max(0, m.start() - 30), min(len(stripped), m.end() + 30)
        leaks.add(stripped[a:b].replace("\n", " "))
        if len(leaks) >= 12:
            break
    return sorted(leaks)
