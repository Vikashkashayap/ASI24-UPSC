import type { ComponentType } from "react";
import { SyllabusTargetsAdminPage } from "../admin/SyllabusTargetsAdminPage";

type SyllabusPageProps = { mode?: "admin" | "mentor" };

/** Mentors get the same Syllabus Targets tools as admin, scoped to their roster. */
export const MentorSyllabusTargetsPage: React.FC = () => {
  const Page = SyllabusTargetsAdminPage as ComponentType<SyllabusPageProps>;
  return <Page mode="mentor" />;
};
