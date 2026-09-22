export type ProgrammeId =
  | "PHONICS"
  | "SUPER_SPEAKERS"
  | "SUPER_CODERS"
  | "SUPER_MATH";

export const PROGRAMMES: { id: ProgrammeId; label: string; grades: string }[] = [
  { id: "PHONICS", label: "English SuperStar (Phonics)", grades: "LKG to Grade 2" },
  { id: "SUPER_SPEAKERS", label: "Super Speakers", grades: "Grade 1 to 10" },
  { id: "SUPER_CODERS", label: "Super Coders", grades: "Grade 1 to 10" },
  { id: "SUPER_MATH", label: "Super Math (V-Math)", grades: "Grade 1 to 8" },
];

export function programmeLabel(id: ProgrammeId): string {
  return PROGRAMMES.find((p) => p.id === id)?.label ?? id;
}

const PROGRAMME_ALIASES: Record<string, ProgrammeId> = {
  phonics: "PHONICS",
  "english superstar": "PHONICS",
  "english superstar (phonics)": "PHONICS",
  "super speakers": "SUPER_SPEAKERS",
  superspeakers: "SUPER_SPEAKERS",
  "super coders": "SUPER_CODERS",
  supercoders: "SUPER_CODERS",
  "super math": "SUPER_MATH",
  "super math (v-math)": "SUPER_MATH",
  "v-math": "SUPER_MATH",
  vmath: "SUPER_MATH",
};

/** Matches a free-text CSV value (name or internal code, any case) to a programme id. */
export function resolveProgramme(value: string): ProgrammeId | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  const byCode = PROGRAMMES.find((p) => p.id.toLowerCase() === normalized.replace(/[\s-]+/g, "_"));
  if (byCode) return byCode.id;

  const byLabel = PROGRAMMES.find((p) => p.label.toLowerCase() === normalized);
  if (byLabel) return byLabel.id;

  if (PROGRAMME_ALIASES[normalized]) return PROGRAMME_ALIASES[normalized];

  return null;
}

const UNIVERSAL_PRECHECKS = `
WHAT'S CHECKED FIRST, BEFORE ANYTHING PROGRAMME-SPECIFIC
These three checks apply the same way regardless of programme, and can pull any candidate down to
On Hold even if their qualification and subject are a perfect match. Never use these alone to reject.

- 3 or more jobs, each under 6 months, in the work history
  => On Hold. Don't reject on this alone, flag it for the culture-fit call to understand the pattern.
- A gap of more than 12 months in the work history with no explanation
  => On Hold. Ask about it on the culture-fit call rather than filtering blind.
- CV suggests candidate currently has a full-time job elsewhere with no flexibility mentioned
  => On Hold. Confirm actual availability against VEL's weekday + alternate-Sunday schedule before booking
  an interview slot.
`;

const CLOSING_RULE = `
ONE RULE THAT APPLIES EVERYWHERE
Only mark Not Considered when the subject gap is real and has no adjacent overlap at all. Every other
uncertain case - communication unproven, teaching unproven, grade-band mismatch, degree borderline - goes
to On Hold with one specific thing flagged to check, never a blind reject. Exceptional/fast-track cases
still go through the interview - nothing skips human review.
`;

const PROGRAMME_RUBRICS: Record<ProgrammeId, string> = {
  PHONICS: `
PROGRAMME: English SuperStar (Phonics) - LKG to Grade 2
Bar to check against: Bachelor's in Early Childhood Education/English (Master's preferred) + early
literacy/phonics certification. Experience isn't fixed by years - warmth and patience with young
learners matters more than tenure.

SELECT (GTG) - Clean Match
- ECE/English degree + phonics certification (Jolly Phonics, Orton-Gillingham, or similar) + has taught
  LKG-Grade 2 before => Clean match on every front.
- Correct degree + phonics certification, but fresher, no paid teaching experience yet => Certification
  substitutes for experience; flag: assess hands-on phonics delivery closely at interview.
- Has taught phonics abroad or in an international curriculum, strong certification, but no exposure to
  Indian parents/curriculum context => Certification and method are sound; flag: verify comfort with
  Indian parent-communication norms at interview.
- Strong theatre/storytelling background used specifically for early-literacy teaching, plus phonics
  certification => Genuine differentiator for this programme - storytelling is core to the role.

SELECT (GTG) - Exceptional / Fast-Track
- Correct degree, phonics certification, strong LKG-2 experience, plus published content or workshop
  facilitation on early literacy => Fast-track, prioritise interview slot.
- Has trained or mentored other phonics teachers (train-the-trainer experience), correct degree and
  certification => Rare signal, worth flagging for a potential mentor/senior-teacher track.
- Has designed or published their own multisensory phonics curriculum or classroom resource, correct
  degree and certification => Strong creative + subject-mastery signal, fast-track.

HOLD (On Hold) - One Thing to Verify
- Strong general Early Childhood Education background, but no phonics-specific certification or
  experience => ECE is not the same as phonics; flag: test phonics-specific teaching ability (blending,
  segmenting, letter-sound) before booking.
- Has only ever taught older grades (6 and above), no early-years exposure at all => Subject may be fine,
  age-group handling isn't proven; flag: grade-fit check.
- Speech-language pathology or early-intervention background, no formal phonics teaching experience =>
  Genuinely adjacent skill set; flag: evaluate how directly it transfers to classroom phonics teaching.
- No mention of English-medium education or spoken English anywhere on the CV => Can't confirm
  communication level from CV alone; flag: language screen before interview.
- PhD or postgraduate specialist in linguistics/literature applying for a part-time phonics role => Don't
  auto-reject; flag: culture-fit call to check expectations and retention risk.
- Diploma (not Bachelor's) in Early Childhood Education, but a strong multi-year phonics teaching track
  record => Flag: check whether the diploma meets the degree-equivalency bar internally before booking.

REJECT (Not Considered)
- Math or Science background only, no English/early-literacy exposure anywhere => No realistic path to
  phonics-readiness without retraining outside scope.
`,

  SUPER_SPEAKERS: `
PROGRAMME: Super Speakers - Grade 1 to 10
Bar to check against: Bachelor's in English/Literature/Education (Master's preferred). TKT/CELTA/DELTA is
a plus, not mandatory. Focus is public speaking, grammar, and communication-skill facilitation, not just
language teaching.

SELECT (GTG) - Clean Match
- English/Literature/Education degree + TKT/CELTA + has facilitated debate, elocution, or public-speaking
  sessions before => Clean match, the facilitation experience is the key differentiator here.
- Correct degree, no facilitation experience, but fresher with strong academic record => Flag: assess
  ability to run a speaking/debate activity live, since this is untested.
- Certified drama/theatre educator with strong stage presence, teaches confidence and expression through
  drama rather than formal debate => Genuine alternate path to the same skill; flag: confirm drama-based
  methods cover the same ground as debate facilitation.

SELECT (GTG) - Exceptional / Fast-Track
- Correct degree, CELTA/DELTA, strong debate/MUN facilitation history, plus awards or published work =>
  Fast-track, prioritise interview slot.
- National-level debate or MUN champion (as competitor or coach), correct degree, some teaching exposure
  => Rare, high-signal profile, fast-track.
- TEDx speaker or published public-speaking coach, holds a qualifying degree => Strong public-facing
  communication credibility, fast-track, but confirm classroom (not stage-only) delivery at interview.

HOLD (On Hold) - One Thing to Verify
- Strong grammar-teaching background (e.g. taught English as a subject) but no public-speaking or debate
  facilitation experience => Grammar knowledge is not the same as speaking facilitation; flag: verify
  ability to run interactive speaking activities.
- Media/communication background (RJ, anchor, journalist, content creator) but no formal teaching
  experience => Communication strength is real, teaching aptitude is unproven; flag: teaching-aptitude
  check.
- Toastmasters/elocution certification and strong speaking ability, but no Bachelor's in a qualifying
  field => Degree requirement isn't marked optional for this programme unlike Math; flag: check for an
  equivalent degree or route through HR exception.
- Has only taught adults (corporate communication training, IELTS coaching for adults) with no K-12
  experience => Skill is real, age-group handling isn't proven; flag: grade-fit check.
- Excellent English fluency and international exposure, but no debate/public-speaking facilitation
  experience specifically => Fluency alone isn't the bar here; flag: verify facilitation skill, not just
  language level.
- School counsellor or soft-skills trainer background, strong communication, no formal English/Lit
  degree, no direct debate facilitation role => Adjacent skill set; flag: verify degree equivalency and
  whether facilitation experience transfers.
- Claims excellent communication skills, but the CV itself has noticeable grammar errors or unclear
  writing => Contradiction between claim and evidence; flag: verify actual spoken/written level at
  interview before trusting the CV's self-description.

REJECT (Not Considered)
- Coding or Math-only background, no English/communication experience at all => No adjacent overlap with
  this programme's core skill.
`,

  SUPER_CODERS: `
PROGRAMME: Super Coders - Grade 1 to 10
Bar to check against: Bachelor's in Computer Science, Education, or a related field, plus strong
programming knowledge across block-based and text-based platforms. Minimum 2 years teaching experience
(coding or related) is preferred.

SELECT (GTG) - Clean Match
- CS/related degree + 2+ years teaching coding + comfortable across Scratch and Python/web basics =>
  Clean match, straight to interview.
- CS/related degree, fresher, no teaching experience, but a solid academic project portfolio => Flag:
  assess ability to explain code to a beginner, since teaching is untested.
- Strong robotics/hardware coding background (Arduino, Microbit), weaker on Python/web development => Real
  coding skill; flag: confirm coverage of the full curriculum range (block + text-based) at interview.

SELECT (GTG) - Exceptional / Fast-Track
- CS degree, strong teaching record, full range across Scratch/Python/web, plus hackathon wins or
  published projects => Fast-track, prioritise interview slot.
- Has built and published a real app or game with actual users, plus some teaching experience => Rare,
  demonstrable build-skill signal, fast-track, confirm teaching depth at interview.
- Competitive-programming background (ACM/ICPC-level or equivalent) + correct degree + some teaching
  exposure => High technical signal, fast-track, but confirm ability to simplify for young learners
  specifically.

HOLD (On Hold) - One Thing to Verify
- Experienced software engineer (5+ years industry), zero teaching experience, applying to switch into
  teaching => Technical depth is not in question; flag: coding-specific teaching-aptitude check (can they
  simplify, not just solve).
- No formal CS/related degree, but strong self-taught portfolio (GitHub projects, recognised
  certifications e.g. Google/Meta, hackathon wins) => The "related field" language leaves room, but it's
  not automatic; flag: verify whether the portfolio genuinely substitutes for the degree requirement.
- Only taught coding to adults or in a corporate bootcamp setting, no K-12 experience => Skill is real,
  age-group handling isn't proven; flag: grade-fit check.
- Senior/architect-level engineer looking for a part-time teaching role => Don't auto-reject; flag:
  culture-fit call to check expectations and retention risk.
- Only knows one narrow area (e.g. only HTML/CSS, no logic-building or Python/Scratch exposure) against a
  programme that needs both block- and text-based coverage => Partial match; flag: confirm actual range of
  languages/platforms candidate can teach.
- Only a short-term bootcamp certificate (a few weeks), no portfolio or teaching experience, fresher =>
  Bootcamp rigor varies widely; flag: verify actual hands-on coding depth before booking.
- Taught coding in a vernacular-medium school, strong logic-teaching ability, weaker English communication
  signals on the CV => Flag: language screen alongside the teaching-aptitude check, since instruction is
  in English.

REJECT (Not Considered)
- Math or English-only background, no coding exposure of any kind => No realistic path without retraining
  outside scope.
`,

  SUPER_MATH: `
PROGRAMME: Super Math (V-Math) - Grade 1 to 8
Bar to check against: B.Sc. Math or equivalent, B.Ed./CTET preferred, minimum 3 years online teaching on a
CBSE/ICSE/State board curriculum, and strong spoken English. This is the one programme where the degree is
explicitly "preferred, not mandatory" if other signals are strong.

SELECT (GTG) - Clean Match
- B.Sc Math/B.Ed/CTET + 3+ years online teaching on CBSE/ICSE + strong spoken English => Clean match,
  straight to interview.
- Correct qualification, fresher, no online teaching experience yet, but CTET-certified => Flag: assess
  online-delivery comfort at interview, since it's untested.
- No formal Math degree, but strong CTET/B.Ed + solid online teaching track record => This is the one
  programme where degree is preferred, not mandatory; strong teaching credentials can substitute.

SELECT (GTG) - Exceptional / Fast-Track
- Correct qualification, strong online CBSE/ICSE track record, plus Vedic Maths/Abacus certification or
  Math Olympiad involvement => Fast-track, prioritise interview slot.
- Math Olympiad mentor/trainer at a national level, strong online CBSE/ICSE teaching track record => Rare,
  high-signal profile, fast-track.
- Has created or published their own problem sets or math learning content for students, strong
  qualification => Strong creative + subject-mastery signal, fast-track.

HOLD (On Hold) - One Thing to Verify
- Strong subject background (engineering degree, IIT/NIT-type profile) but zero teaching experience =>
  Math strength is not in question; flag: teaching-aptitude check, since explanation ability is untested.
- Correct teaching experience, but subject depth looks basic (e.g. commerce background, only ever taught
  lower-grade arithmetic, no algebra/geometry exposure) => Flag: subject-depth check before committing an
  interview slot, since Grade 1-8 needs range up to pre-algebra/geometry.
- Has only taught senior grades (JEE/board-exam prep, Grade 9+), no primary-grade (1-5) experience =>
  Subject strength is fine, age-group handling isn't proven; flag: grade-fit check.
- PhD or postgraduate Math specialist applying for a part-time online tutoring role => Don't auto-reject;
  flag: culture-fit call to check expectations and retention risk.
- No mention of spoken English or English-medium background anywhere on the CV => Flag: language screen
  before interview, since strong spoken English is explicitly required.
- Strong Abacus/Vedic Maths background, but never taught a formal CBSE/ICSE school curriculum => Flag:
  verify depth against the actual school syllabus, since Abacus-only teaching doesn't cover the same
  ground.
- Strong math ability, teaches primarily in a regional language, no clear evidence of spoken English
  strength => Flag: language screen required, spoken English is an explicit requirement, not assumed from
  subject strength.
- Excellent qualification and past track record, but a 2+ year career break (e.g. maternity/family
  reasons) since last taught => Not a red flag on its own; flag: quick refresher/confidence check rather
  than treating the break as a gap concern.

REJECT (Not Considered)
- English or Coding-only background, no math-subject experience or qualification at all => No adjacent
  overlap with this programme.
`,
};

export function buildAnalysisPrompt(params: {
  programme: ProgrammeId;
  candidateName: string;
  resumeText: string;
  subject?: string | null;
}): string {
  const { programme, candidateName, resumeText, subject } = params;

  return `You are a resume screener for Vedantu Early Learning (VEL), evaluating a candidate CV for a
master teacher role. Apply the rubric below EXACTLY as written. Read the whole CV, then decide.

${UNIVERSAL_PRECHECKS}

${PROGRAMME_RUBRICS[programme]}

${CLOSING_RULE}

HOW TO DECIDE
1. First check the three universal pre-checks. If any apply, the candidate cannot be GTG - at best they
   are On Hold (the pre-check reason still needs to be combined with the programme-specific read).
2. Then read the CV against the programme-specific tables above, top to bottom (clean-match Select first,
   then exceptional/fast-track, then Hold cases, then Reject). Pick the row that best matches the
   candidate's actual profile as evidenced in the CV text. Do not invent facts not supported by the CV;
   where the CV is silent on something the rubric asks about (e.g. spoken English, certification), treat
   it as absent/unproven, which is itself often a Hold signal per the rubric.
3. Map your decision to exactly one verdict:
   - "GTG" for any Select row (clean match or exceptional/fast-track). Set fastTrack=true only if the
     matched row is from the Exceptional/Fast-Track table.
   - "ON_HOLD" for any Hold row, or if a universal pre-check applies.
   - "NOT_CONSIDERED" only for the Reject row (real subject gap, no adjacent overlap at all). This is a
     last resort per the closing rule.
4. Write a concise, specific reason (1-3 sentences) grounded in what the CV actually shows, in the same
   spirit as the "Why / what to check" column above. If On Hold, name the ONE specific thing to verify.

Candidate name: ${candidateName}
Programme applied for: ${programmeLabel(programme)}
${subject ? `Subject/role stated on the candidate's application: ${subject} (context only - weigh what the CV itself actually shows more heavily than this self-reported label)\n` : ""}
RESUME TEXT (extracted from uploaded file):
"""
${resumeText}
"""

Respond with ONLY a single JSON object, no markdown fences, no commentary, matching exactly this shape:
{
  "verdict": "GTG" | "ON_HOLD" | "NOT_CONSIDERED",
  "fastTrack": boolean,
  "matchedProfile": string,   // the candidate-profile row you matched, paraphrased in a few words
  "reason": string,           // the concise reason / what-to-check, grounded in the CV
  "flags": string[]           // short list of specific things to verify at interview, if any (else [])
}`;
}
