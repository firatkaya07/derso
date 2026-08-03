import ProgramBoard from "../ProgramBoard";

export default async function ClassProgramPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <ProgramBoard initialClassId={classId} />;
}
