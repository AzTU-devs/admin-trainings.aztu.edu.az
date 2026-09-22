import { Link } from "react-router";
import { ArrowLeft, SearchX } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { EmptyState } from "./EmptyState";

interface Props {
  /** Page heading, e.g. "Course not found". */
  title: string;
  description?: string;
  /** Where to go instead: the list the missing thing would have been in. */
  backTo: string;
  backLabel: string;
  /**
   * The URL segment that named the missing thing. Its breadcrumb reads "Not
   * found" rather than "Details" or a humanized slug.
   */
  missingSegment?: string;
}

/**
 * A page for "the thing in this URL does not exist", inside the dashboard
 * shell. A missing course used to render one red line, "Course not found.",
 * with no heading, no breadcrumb and no way back but the browser's Back button.
 */
export function NotFoundState({ title, description, backTo, backLabel, missingSegment }: Props) {
  return (
    <>
      <PageHeader title={title} crumbLabels={missingSegment ? { [missingSegment]: "Not found" } : undefined} />
      <EmptyState
        Icon={SearchX}
        title="Nothing at this address"
        description={description ?? "It may have been deleted, or the link may be wrong."}
        action={
          <Button asChild variant="secondary" leftIcon={<ArrowLeft className="size-4" />}>
            <Link to={backTo}>{backLabel}</Link>
          </Button>
        }
      />
    </>
  );
}
