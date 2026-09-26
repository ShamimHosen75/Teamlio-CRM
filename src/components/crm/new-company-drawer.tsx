import { useState, type ReactNode } from "react";
import { Building2, Globe, Mail, MapPin, Phone, Plus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { FormDrawer } from "@/components/shared/form-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateClient, useUsers } from "@/hooks/use-data";
import { useOrgId } from "@/app/workspace";
import type { Client, ClientStatus } from "@/lib/types";

const INDUSTRY_OPTIONS = [
  "Technology & Software",
  "Financial Services",
  "Healthcare & Life Sciences",
  "Manufacturing & Industrial",
  "Retail & E-commerce",
  "Marketing & Advertising",
  "Professional & Legal Services",
  "Real Estate & Construction",
  "Education & Training",
  "Consulting & Business Services",
  "Media & Entertainment",
  "Logistics & Supply Chain",
  "General",
];

const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: "Active", label: "Active" },
  { value: "Prospect", label: "Prospect" },
  { value: "Inactive", label: "Inactive" },
  { value: "Churned", label: "Churned" },
];

export interface NewCompanyDrawerProps {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: (company: Client) => void;
}

export function NewCompanyDrawer({
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
}: NewCompanyDrawerProps) {
  const orgId = useOrgId();
  const createClient = useCreateClient();
  const { data: users = [] } = useUsers();

  const [form, setForm] = useState({
    company: "",
    contact_name: "",
    industry: "Technology & Software",
    status: "Active" as ClientStatus,
    email: "",
    phone: "",
    website: "",
    address: "",
    owner_user_id: "none",
    notes: "",
  });

  const resetForm = () => {
    setForm({
      company: "",
      contact_name: "",
      industry: "Technology & Software",
      status: "Active",
      email: "",
      phone: "",
      website: "",
      address: "",
      owner_user_id: "none",
      notes: "",
    });
  };

  const handleSubmit = async () => {
    const trimmedCompany = form.company.trim();
    if (!trimmedCompany) {
      toast.error("Company name is required");
      return false;
    }

    if (!orgId) {
      toast.error("Please select a workspace before creating a company");
      return false;
    }

    try {
      const newRecord = await createClient.mutateAsync({
        company: trimmedCompany,
        name: form.contact_name.trim() || trimmedCompany,
        industry: form.industry,
        status: form.status,
        email: form.email.trim(),
        phone: form.phone.trim(),
        website: form.website.trim(),
        address: form.address.trim(),
        owner_user_id: form.owner_user_id === "none" ? undefined : form.owner_user_id,
        notes: form.notes.trim(),
      } as Partial<Client>);

      toast.success(`Company "${trimmedCompany}" added successfully!`);
      resetForm();
      onSuccess?.(newRecord);
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Failed to add company. Please try again.");
      return false;
    }
  };

  return (
    <FormDrawer
      trigger={
        trigger ?? (
          <Button size="sm" className="gap-1.5 shadow-sm">
            <Plus className="size-4" />
            <span>New Company</span>
          </Button>
        )
      }
      open={controlledOpen}
      onOpenChange={onOpenChange}
      title="Add New Company"
      description="Create a new company profile to track client engagements, projects, and contacts."
      submitLabel={createClient.isPending ? "Adding..." : "Add Company"}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        {/* Company Name */}
        <div className="space-y-1.5">
          <Label htmlFor="company-name" className="flex items-center gap-1 text-xs font-semibold">
            Company Name <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              id="company-name"
              placeholder="e.g. Acme Corporation"
              value={form.company}
              onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        {/* Primary Contact & Industry */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="company-contact" className="text-xs font-semibold">
              Primary Contact Person
            </Label>
            <Input
              id="company-contact"
              placeholder="e.g. Sarah Connor"
              value={form.contact_name}
              onChange={(e) => setForm((prev) => ({ ...prev, contact_name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-industry" className="text-xs font-semibold">
              Industry
            </Label>
            <Select
              value={form.industry}
              onValueChange={(val) => setForm((prev) => ({ ...prev, industry: val }))}
            >
              <SelectTrigger id="company-industry" aria-label="Company industry">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRY_OPTIONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status & Account Owner */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="company-status" className="text-xs font-semibold">
              Status
            </Label>
            <Select
              value={form.status}
              onValueChange={(val) => setForm((prev) => ({ ...prev, status: val as ClientStatus }))}
            >
              <SelectTrigger id="company-status" aria-label="Company status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-owner" className="flex items-center gap-1 text-xs font-semibold">
              <UserCheck className="size-3.5 text-muted-foreground" />
              Account Owner
            </Label>
            <Select
              value={form.owner_user_id}
              onValueChange={(val) => setForm((prev) => ({ ...prev, owner_user_id: val }))}
            >
              <SelectTrigger id="company-owner" aria-label="Account owner">
                <SelectValue placeholder="Assign an owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Contact Info: Email & Phone */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="company-email" className="text-xs font-semibold">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="company-email"
                type="email"
                placeholder="contact@company.com"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-phone" className="text-xs font-semibold">
              Phone Number
            </Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="company-phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Website & Address */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="company-website" className="text-xs font-semibold">
              Website
            </Label>
            <div className="relative">
              <Globe className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="company-website"
                type="url"
                placeholder="https://company.com"
                value={form.website}
                onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-address" className="text-xs font-semibold">
              Address / Location
            </Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="company-address"
                placeholder="City, Country"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="company-notes" className="text-xs font-semibold">
            Notes & Description
          </Label>
          <Textarea
            id="company-notes"
            rows={3}
            placeholder="Key details, company history, or engagement context..."
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>
      </div>
    </FormDrawer>
  );
}
