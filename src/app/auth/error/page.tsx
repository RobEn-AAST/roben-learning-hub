import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params?.message || params?.error;
  
  const isAccessDenied = errorMessage?.includes('Access denied') || errorMessage?.includes('Admin privileges required');

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {isAccessDenied ? 'Access Denied' : 'Sorry, something went wrong.'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMessage ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {isAccessDenied 
                      ? 'You do not have the required permissions to access this page. Admin privileges are required.'
                      : `Error: ${errorMessage}`
                    }
                  </p>
                  {isAccessDenied && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        <strong>Need admin access?</strong> Contact your system administrator to request admin privileges.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  An unspecified error occurred.
                </p>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild className="flex-1">
                  <Link href="/">
                    Go Home
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/auth/login">
                    Login
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
