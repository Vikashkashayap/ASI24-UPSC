import type { ComponentType } from "react";
import { AssignedPracticeAdminPage } from "../admin/AssignedPracticeAdminPage";

type PracticePageProps = { mode?: "admin" | "mentor" };

/** Mentors get the same Topic Practice tools as admin, scoped to their roster. */
export const MentorTopicPracticePage: React.FC = () => {
  const Page = AssignedPracticeAdminPage as ComponentType<PracticePageProps>;
  return <Page mode="mentor" />;
};
