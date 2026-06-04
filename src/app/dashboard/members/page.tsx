"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, User, Phone, StickyNote, MoreVertical, Search, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import { MOCK_MEMBERS } from "@/lib/mock-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export default function MembersPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline text-primary">Family Network</h1>
          <p className="text-muted-foreground font-body">Manage member profiles and notes</p>
        </div>
        <Button className="rounded-full shadow-lg" asChild>
          <Link href="/dashboard/members/new">
            <Plus className="w-4 h-4 mr-2" /> Add Member
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search members..." className="pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_MEMBERS.map((member) => (
          <Card key={member.id} className="overflow-hidden group hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <CardTitle className="font-headline text-lg group-hover:text-primary transition-colors">
                    <Link href={`/dashboard/members/${member.id}`}>{member.name}</Link>
                  </CardTitle>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <Phone className="w-3 h-3 mr-1" /> {member.phone}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/members/${member.id}/edit`} className="flex items-center">
                      <Edit2 className="w-4 h-4 mr-2" /> Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-start gap-2">
                <StickyNote className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground italic">
                  {member.notes || "No additional notes provided."}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}