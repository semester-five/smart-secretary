import Link from "next/link";

import { ArrowLeft, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchMeetingsAction } from "@/server/api-actions";

export default async function MeetingSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    keyword?: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;

  const page = Number(query.page ?? "1");
  const pageSize = Number(query.pageSize ?? "20");
  const result = await searchMeetingsAction({
    projectId,
    keyword: query.keyword,
    fromDate: query.fromDate,
    toDate: query.toDate,
    status: query.status,
    page: Number.isNaN(page) ? 1 : page,
    pageSize: Number.isNaN(pageSize) ? 20 : pageSize,
  }).catch(() => ({ data: [], total: 0, page: 1, page_size: 20, total_pages: 1 }));

  const buildQueryString = (nextPage: number) => {
    const params = new URLSearchParams();
    if (query.keyword) params.set("keyword", query.keyword);
    if (query.fromDate) params.set("fromDate", query.fromDate);
    if (query.toDate) params.set("toDate", query.toDate);
    if (query.status) params.set("status", query.status);
    params.set("page", String(nextPage));
    params.set("pageSize", String(Number.isNaN(pageSize) ? 20 : pageSize));
    return params.toString();
  };

  const previousPage = Math.max(1, result.page - 1);
  const nextPage = Math.min(result.total_pages, result.page + 1);

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <Link
          href={`/dashboard/projects/${projectId}/meetings`}
          className="inline-flex items-center font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to meetings
        </Link>
      </div>

      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Search meetings</h1>
        <p className="mt-1 text-muted-foreground text-sm">Filter meetings by date, status and keyword.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Search className="size-5" />
            Filters
          </CardTitle>
          <CardDescription>Searches metadata and indexed meeting content.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-6">
            <Input name="keyword" defaultValue={query.keyword} placeholder="Keyword" />
            <Input name="fromDate" type="datetime-local" defaultValue={query.fromDate} />
            <Input name="toDate" type="datetime-local" defaultValue={query.toDate} />
            <select
              name="status"
              defaultValue={query.status ?? ""}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All status</option>
              <option value="draft">draft</option>
              <option value="processing">processing</option>
              <option value="ready_for_review">ready_for_review</option>
              <option value="finalized">finalized</option>
              <option value="archived">archived</option>
              <option value="failed">failed</option>
            </select>
            <div className="flex gap-2">
              <Input name="pageSize" defaultValue={query.pageSize ?? "20"} placeholder="Page size" />
              <Button type="submit">Apply</Button>
            </div>
            <Link
              href={`/dashboard/projects/${projectId}/meetings/search`}
              className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm transition-colors hover:bg-muted/30"
            >
              Reset
            </Link>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            <span className="inline-flex items-center gap-2">
              <Badge variant="secondary">Total {result.total}</Badge>
              <Badge variant="outline">Page {result.page}</Badge>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No meetings found.</p>
          ) : (
            result.data.map((meeting) => (
              <Link
                key={meeting.id}
                href={`/dashboard/projects/${projectId}/meetings/${meeting.id}`}
                className="block rounded-lg border p-3 transition-colors hover:bg-muted/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-sm">{meeting.title}</p>
                  <Badge variant="secondary">{meeting.status}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground text-xs">{new Date(meeting.meeting_date).toLocaleString()}</p>
              </Link>
            ))
          )}

          <div className="flex items-center justify-between pt-2">
            <Link
              href={`/dashboard/projects/${projectId}/meetings/search?${buildQueryString(previousPage)}`}
              className={`inline-flex items-center rounded-md border px-3 py-2 text-sm transition-colors ${result.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-muted/30"}`}
            >
              Previous
            </Link>
            <span className="text-muted-foreground text-sm">
              Page {result.page} / {result.total_pages}
            </span>
            <Link
              href={`/dashboard/projects/${projectId}/meetings/search?${buildQueryString(nextPage)}`}
              className={`inline-flex items-center rounded-md border px-3 py-2 text-sm transition-colors ${result.page >= result.total_pages ? "pointer-events-none opacity-50" : "hover:bg-muted/30"}`}
            >
              Next
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
