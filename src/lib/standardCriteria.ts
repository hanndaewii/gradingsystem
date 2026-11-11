// The standard grading criteria — the class-record layout from the
// professor's Excel sheet:
//
//   A (10%) | R-1 R-2 R-3 (one Total group, 30%) | Q-1 (10%) | Q-2 (10%) | Exam (40%)
//
// Weights total 100 (10 + 10+10+10 + 10 + 10 + 40). Every new section starts
// with these, and they can be edited per period from the Assessments panel.

export interface StandardCriterion {
  name: string;
  maxScore: number;
  weight: number;
  /** Equal keys collapse into one "Total" column. */
  group: string | null;
}

export const STANDARD_CRITERIA: StandardCriterion[] = [
  { name: "A", maxScore: 100, weight: 10, group: null },
  { name: "R-1", maxScore: 100, weight: 10, group: "recitation" },
  { name: "R-2", maxScore: 100, weight: 10, group: "recitation" },
  { name: "R-3", maxScore: 100, weight: 10, group: "recitation" },
  { name: "Q-1", maxScore: 100, weight: 10, group: null },
  { name: "Q-2", maxScore: 100, weight: 10, group: null },
  { name: "Exam", maxScore: 100, weight: 40, group: null },
];

/** The defs shape the api's setAssessments expects. */
export const standardCriteriaDefs = (): {
  name: string;
  maxScore: number;
  weight: number | null;
  group: string | null;
}[] => STANDARD_CRITERIA.map((c) => ({ ...c }));
