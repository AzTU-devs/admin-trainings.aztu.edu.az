import { Link } from "react-router";
import { Helmet } from "react-helmet-async";
import { ROUTES } from "@shared/constants/routes";
import { Button } from "@shared/components/ui";
import { StatusScreen } from "@features/auth/components/StatusScreen";

export default function ForbiddenPage() {
  return (
    <>
      <Helmet>
        <title>403 · Access denied · AzTU Portal</title>
      </Helmet>
      <StatusScreen
        code={["4", "3"]}
        zero="shield"
        eyebrow="403 · Forbidden"
        title="You don't have access to this page"
        description="Your account doesn't carry the role required to view this resource. If you believe this is a mistake, contact an administrator."
        action={
          <Button asChild size="lg">
            <Link to={ROUTES.dashboard}>Back to dashboard</Link>
          </Button>
        }
      />
    </>
  );
}
