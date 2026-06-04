"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Phone, StickyNote, MoreVertical, Search, Edit2, Trash2, Loader2, Users } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { collection, query, where, deleteDoc, doc } from "firebase/firestore";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { FamilyMember } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function MembersPage() {
  const { user } = useUser();
  const db = useFirestore();

  const membersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "members"), where("ownerId", "==", user.uid));
  }, [db, user]);

  const { data: members, loading } = useCollection<FamilyMember>(membersQuery);

  const handleDelete = (memberId: string) => {
    if (!db) return;
    if (confirm("Remove this family member?")) {
      const docRef = doc(db, "members", memberId);
      deleteDoc(docRef).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: "delete",
        });
        errorEmitter.emit("permission-error", permissionError);
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members?.map((member) => (
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
                  <DropdownMenuItem 
                    onClick={() => handleDelete(member.id)}
                    className="text-destructive focus:text-destructive"
                  >
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
        {!loading && members?.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-muted-foreground">No family members found. Start by adding one!</p>
          </div>
        )}
      </div>
    </div>
  );
}
