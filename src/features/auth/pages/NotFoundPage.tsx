import { Link } from "react-router";
import { Helmet } from "react-helmet-async";
import { ROUTES } from "@shared/constants/routes";
import { Button } from "@shared/components/ui";
import { StatusScreen } from "@features/auth/components/StatusScreen";

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>404 · Page not found · AzTU Portal</title>
      </Helmet>
      <StatusScreen
        code={["4", "4"]}
        zero="digit"
        eyebrow="404 · Not found"
        title="We couldn't find that page"
        description="The page you're looking for may have been moved, renamed, or never existed."
        action={
          <Button asChild size="lg">
            <Link to={ROUTES.dashboard}>Back to dashboard</Link>
          </Button>
        }
      />
    </>
  );
}
