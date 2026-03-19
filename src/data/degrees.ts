export interface RequirementSlot {
  id: string
  courseCode?: string
  label: string
  flexible: boolean  // if true, student fills in the actual course
}

export interface RequirementCategory {
  id: string
  name: string
  slots: RequirementSlot[]
}

export interface DegreeDefinition {
  id: string
  name: string
  shortName: string
  categories: RequirementCategory[]
}

export const DEGREES: DegreeDefinition[] = [
  {
    id: 'fnar-major',
    name: 'Fine Arts Major',
    shortName: 'FNAR Major',
    categories: [
      {
        id: 'core-studio',
        name: 'Core Studio',
        slots: [
          { id: 'fnar-0010', courseCode: 'FNAR 0010', label: 'Drawing I', flexible: false },
          { id: 'fnar-0020', courseCode: 'FNAR 0020', label: 'Contemporary Art Studio', flexible: false },
        ],
      },
      {
        id: 'intro-studio',
        name: 'Intro Studio',
        slots: [
          { id: 'intro-studio-1', label: 'Intro Studio', flexible: true },
          { id: 'intro-studio-2', label: 'Intro Studio', flexible: true },
          { id: 'intro-studio-3', label: 'Intro Studio', flexible: true },
        ],
      },
      {
        id: 'arth-theory',
        name: 'Art History / Theory',
        slots: [
          { id: 'arth-1', label: 'Art History', flexible: true },
          { id: 'arth-2', label: 'Art History', flexible: true },
          { id: 'arth-3', label: 'Art History', flexible: true },
        ],
      },
      {
        id: 'senior-sem',
        name: 'Senior Seminar',
        slots: [
          { id: 'fnar-4020', courseCode: 'FNAR 4020', label: 'Senior Sem Fall', flexible: false },
          { id: 'fnar-4030', courseCode: 'FNAR 4030', label: 'Senior Sem Spring', flexible: false },
        ],
      },
      {
        id: 'electives',
        name: 'Electives',
        slots: [
          { id: 'elective-1', label: 'Elective', flexible: true },
          { id: 'elective-2', label: 'Elective', flexible: true },
          { id: 'elective-3', label: 'Elective', flexible: true },
          { id: 'elective-4', label: 'Elective', flexible: true },
        ],
      },
    ],
  },
  {
    id: 'dsgn-major',
    name: 'Design Major',
    shortName: 'DSGN Major',
    categories: [
      {
        id: 'dsgn-core-studio',
        name: 'Core Studio',
        slots: [
          { id: 'dsgn-0020', courseCode: 'DSGN 0020', label: 'Design 21', flexible: false },
          { id: 'dsgn-0010', courseCode: 'DSGN 0010', label: 'ADDC', flexible: false },
        ],
      },
      {
        id: 'dsgn-integ-studio',
        name: 'Integrative Studio',
        slots: [
          { id: 'dsgn-integ-1', label: 'Integrative Studio', flexible: true },
          { id: 'dsgn-integ-2', label: 'Integrative Studio', flexible: true },
          { id: 'dsgn-integ-3', label: 'Integrative Studio', flexible: true },
        ],
      },
      {
        id: 'dsgn-hist-theory',
        name: 'History and Theory',
        slots: [
          { id: 'dsgn-theory-1', label: 'Theory', flexible: true },
          { id: 'dsgn-theory-2', label: 'Theory', flexible: true },
          { id: 'dsgn-history-1', label: 'History', flexible: true },
        ],
      },
      {
        id: 'dsgn-senior-sem',
        name: 'Senior Seminar',
        slots: [
          { id: 'dsgn-4020', courseCode: 'DSGN 4020', label: 'Senior Sem Fall', flexible: false },
          { id: 'dsgn-4030', courseCode: 'DSGN 4030', label: 'Senior Sem Spring', flexible: false },
        ],
      },
      {
        id: 'dsgn-electives',
        name: 'Electives',
        slots: [
          { id: 'dsgn-elective-1', label: 'Elective', flexible: true },
          { id: 'dsgn-elective-2', label: 'Elective', flexible: true },
          { id: 'dsgn-elective-3', label: 'Elective', flexible: true },
          { id: 'dsgn-elective-4', label: 'Elective', flexible: true },
        ],
      },
    ],
  },
  {
    id: 'fnar-minor',
    name: 'Fine Arts Minor',
    shortName: 'FNAR Minor',
    categories: [
      {
        id: 'fnar-minor-intro-studio',
        name: 'Intro Studio',
        slots: [
          { id: 'fnar-minor-intro-1', label: 'Intro Studio', flexible: true },
          { id: 'fnar-minor-intro-2', label: 'Intro Studio', flexible: true },
        ],
      },
      {
        id: 'fnar-minor-arth-theory',
        name: 'Art History / Theory',
        slots: [
          { id: 'fnar-minor-arth-1', label: 'Art History / Theory', flexible: true },
        ],
      },
      {
        id: 'fnar-minor-electives',
        name: 'Electives',
        slots: [
          { id: 'fnar-minor-elective-1', label: 'Elective', flexible: true },
          { id: 'fnar-minor-elective-2', label: 'Elective', flexible: true },
          { id: 'fnar-minor-elective-3', label: 'Elective', flexible: true },
        ],
      },
    ],
  },
  {
    id: 'dsgn-minor',
    name: 'Design Minor',
    shortName: 'DSGN Minor',
    categories: [
      {
        id: 'dsgn-minor-core-studio',
        name: 'Core Studio',
        slots: [
          { id: 'dsgn-minor-addc', label: 'ADDC', flexible: true },
        ],
      },
      {
        id: 'dsgn-minor-integ-studio',
        name: 'Integrative Studio',
        slots: [
          { id: 'dsgn-minor-integ-1', label: 'Integrative Studio', flexible: true },
          { id: 'dsgn-minor-integ-2', label: 'Integrative Studio', flexible: true },
        ],
      },
      {
        id: 'dsgn-minor-arth-theory',
        name: 'Art History / Theory',
        slots: [
          { id: 'dsgn-minor-arth-1', label: 'Art History / Theory', flexible: true },
        ],
      },
      {
        id: 'dsgn-minor-electives',
        name: 'Electives (FNAR/DSGN)',
        slots: [
          { id: 'dsgn-minor-elective-1', label: 'Elective', flexible: true },
          { id: 'dsgn-minor-elective-2', label: 'Elective', flexible: true },
        ],
      },
    ],
  },
]

export function getDegree(id: string): DegreeDefinition | undefined {
  return DEGREES.find((d) => d.id === id)
}

export function totalSlots(degree: DegreeDefinition): number {
  return degree.categories.reduce((sum, cat) => sum + cat.slots.length, 0)
}
