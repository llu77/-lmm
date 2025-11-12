import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/navbar";

export default function Migration() {
  return (
    <>
      <Navbar />
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>الترحيل والنقل</CardTitle>
            <CardDescription>صفحة إدارة الترحيل والنقل</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              هذه الصفحة قيد التطوير...
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
