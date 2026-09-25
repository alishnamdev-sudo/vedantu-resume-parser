import { analyzeResume } from "../src/lib/analyze";
import type { ProgrammeId } from "../src/lib/rubric";

const cases: { label: string; programme: ProgrammeId; expect: string; text: string }[] = [
  {
    label: "Phonics clean match, not currently employed",
    programme: "PHONICS",
    expect: "GTG",
    text: `Anita Rao. B.Ed in Early Childhood Education, Delhi University (2016). Jolly Phonics certified (2017).
Phonics Teacher, Little Steps Preschool, Delhi (June 2017 - March 2023): taught phonics, blending and segmenting to LKG-Grade 2.
Ran storytelling sessions and parent workshops. Educated in English medium schools. Fluent spoken English.`,
  },
  {
    label: "Coders clean match, currently employed (part of normal CV)",
    programme: "SUPER_CODERS",
    expect: "GTG",
    text: `Rahul Mehta. B.Tech Computer Science, 2019. Coding Instructor, CodeKids Academy (2020 - Present): taught Scratch, Python and
HTML/CSS to Grades 3-9 for 4 years. Built classroom projects, mentored junior teachers. English-medium education.`,
  },
  {
    label: "Math clean match, currently employed",
    programme: "SUPER_MATH",
    expect: "GTG",
    text: `Sunita Iyer. B.Sc Mathematics (2014), B.Ed (2016), CTET qualified. Online Math Teacher, TutorHub (2018 - Present): 6 years
teaching Grades 4-8 CBSE/ICSE maths online. Strong spoken English, English-medium schooling.`,
  },
  {
    label: "Speakers clean match, no employment dates issues",
    programme: "SUPER_SPEAKERS",
    expect: "GTG",
    text: `Kavya Nair. MA English Literature (2018), CELTA certified. Debate coach at St Marys School 2018-2023, ran MUN and elocution
sessions for Grades 5-10. Published a public-speaking workbook.`,
  },
  {
    label: "Coders, explicitly full-time employed elsewhere",
    programme: "SUPER_CODERS",
    expect: "ON_HOLD",
    text: `Neha Kapoor. B.Tech CS 2017. Senior Software Engineer, Infosys (2019 - Present), full-time, Mon-Fri 9-6. Taught Scratch and Python
to Grades 4-8 at a coding club for 3 years (2016-2019). English-medium education.`,
  },
  {
    label: "Coders, three jobs each under 6 months",
    programme: "SUPER_CODERS",
    expect: "ON_HOLD",
    text: `Arjun Verma. B.Tech CS 2018. Coding Tutor, Startup A (Jan-Apr 2022); Coding Tutor, Startup B (May-Aug 2022); Coding Instructor,
Startup C (Sep 2022-Jan 2023). Taught Scratch and Python to Grades 3-8 across roles. English-medium education.`,
  },
  {
    label: "Coders, 2-year gap between roles",
    programme: "SUPER_CODERS",
    expect: "ON_HOLD",
    text: `Pooja Sen. B.Tech CS 2015. Coding Instructor, Academy A (2016-2018). Coding Instructor, Academy B (2021-2023). Taught Scratch and
Python to Grades 3-9. English-medium education.`,
  },
  {
    label: "Phonics, ECE degree but no phonics certification or experience",
    programme: "PHONICS",
    expect: "ON_HOLD",
    text: `Meera Das. B.Ed Early Childhood Education (2015). Nursery teacher at Sunshine Kindergarten 2015-2022, taught play-based learning
and rhymes. English-medium education. No phonics-specific training listed.`,
  },
  {
    label: "Phonics candidate with only Math background",
    programme: "PHONICS",
    expect: "NOT_CONSIDERED",
    text: `Vikram Shah. B.Sc Mathematics. Taught Grade 9-10 Maths and Science at a school 2015-2022. No English or early-years teaching.`,
  },
];

const results = await Promise.all(
  cases.map(async (c) => {
    try {
      const { result } = await analyzeResume({ programme: c.programme, candidateName: "Test", resumeText: c.text });
      return `${result.verdict === c.expect ? "OK  " : "MISS"} ${c.label}\n     expected ${c.expect}, got ${result.verdict}${result.fastTrack ? " (fast-track)" : ""}\n     ${result.reason}\n     flags: ${JSON.stringify(result.flags)}`;
    } catch (e) {
      return `ERR  ${c.label}: ${e instanceof Error ? e.message : e}`;
    }
  })
);
console.log(results.join("\n\n"));
