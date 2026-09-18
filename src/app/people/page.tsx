import { listMembers } from "@/db/members";
import PeopleView from "@/ui/people/PeopleView";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const members = await listMembers();
  return (
    <div className="wrap">
      <PeopleView members={members.map((m) => ({ id: m.id, name: m.name, avatarColor: m.avatarColor }))} />
    </div>
  );
}
