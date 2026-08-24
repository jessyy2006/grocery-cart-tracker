import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Compass } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404: unknown route", location.pathname);
  }, [location.pathname]);

  return (
    <PageShell>
      <EmptyState
        icon={Compass}
        title="this page doesn't exist"
        description="The screen you tried to open isn't part of the app."
        action={
          <Button variant="primaryLight" size="lg" onClick={() => navigate("/", { replace: true })}>
            back home
          </Button>
        }
      />
    </PageShell>
  );
};

export default NotFound;
