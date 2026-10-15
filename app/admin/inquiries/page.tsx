import { AdminDesk } from "@/components/admin/AdminDesk";
import { adminPageGuard } from "@/lib/admin-guard";

export default async function InquiriesPage() {
  await adminPageGuard("/admin/inquiries");
  return <AdminDesk />;
}
