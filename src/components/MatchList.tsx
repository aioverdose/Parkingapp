"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, MessageCircle, MapPin, Car, User as UserIcon } from "lucide-react";
import { createBrowserClient } from "@/lib/supabaseClient";

interface Match {
  id: string;
  spot_id: string;
  spot_owner_id: string;
  seeker_id: string;
  status: "pending" | "confirmed_by_owner" | "confirmed_by_seeker" | "confirmed" | "rejected" | "expired";
  created_at: string;
  updated_at: string;
  spot: {
    id: string;
    address: string;
    latitude: number;
    longitude: number;
    departure_time: string;
    return_time: string | null;
    vehicle_type: string | null;
  };
  spot_owner: {
    id: string;
    name: string | null;
    vehicle_type: string | null;
  };
  seeker: {
    id: string;
    name: string | null;
    vehicle_type: string | null;
  };
}

interface MatchListProps {
  onClose: () => void;
  onChatOpen: (chatId: string, spotId: string) => void;
}

export function MatchList({ onClose, onChatOpen }: MatchListProps) {
  const supabase = createBrowserClient();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  async function fetchMatches(_uid: string) {
    const token = await getAuthToken();
    if (!token) { setLoading(false); return; }

    const res = await fetch("/api/matches?status=all", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setMatches(data.matches ?? []);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { setLoading(false); return; }
      setUserId(session.user.id);
      fetchMatches(session.user.id);
    });
  }, []);

  const handleAction = async (matchId: string, action: "confirm" | "reject") => {
    setActionLoading(matchId);
    const token = await getAuthToken();
    if (!token) { setActionLoading(null); return; }

    await fetch(`/api/matches/${matchId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action }),
    });

    // Refresh
    if (userId) fetchMatches(userId);
    setActionLoading(null);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-8 text-center">
        <Loader2 className="animate-spin mx-auto" size={32} />
        <p className="text-zinc-500">Loading matches...</p>
      </div>
    );
  }

  const pendingMatches = matches.filter(
    (m) => m.status === "pending" || m.status === "confirmed_by_owner" || m.status === "confirmed_by_seeker"
  );
  const confirmedMatches = matches.filter((m) => m.status === "confirmed");

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-bold">My Matches</h2>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {pendingMatches.length === 0 && confirmedMatches.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <UserIcon size={28} className="text-zinc-400" />
            </div>
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">No matches yet</p>
            <p className="text-sm text-zinc-500 mt-1">
              List your parking spot and the system will match you with compatible drivers.
            </p>
          </div>
        )}

        {pendingMatches.length > 0 && (
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2">Pending</p>
            {pendingMatches.map((match) => {
              const isOwner = userId === match.spot_owner_id;
              const otherUser = isOwner ? match.seeker : match.spot_owner;
              const myConfirmed = isOwner
                ? match.status === "confirmed_by_owner"
                : match.status === "confirmed_by_seeker";
              const otherConfirmed = isOwner
                ? match.status === "confirmed_by_seeker"
                : match.status === "confirmed_by_owner";

              return (
                <div
                  key={match.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold truncate max-w-[200px]">
                          {match.spot.address || "Parking spot"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {match.spot.departure_time && formatDate(match.spot.departure_time)} &middot;{" "}
                          {match.spot.departure_time && formatTime(match.spot.departure_time)} &ndash;{" "}
                          {match.spot.return_time && formatTime(match.spot.return_time)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <UserIcon size={14} />
                    <span>{otherUser?.name || "Driver"}</span>
                    {otherUser?.vehicle_type && (
                      <>
                        <span className="text-zinc-300">|</span>
                        <Car size={14} />
                        <span>{otherUser.vehicle_type}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      myConfirmed
                        ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                    }`}>
                      You: {myConfirmed ? "Confirmed" : "Pending"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      otherConfirmed
                        ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    }`}>
                      Them: {otherConfirmed ? "Confirmed" : "Pending"}
                    </span>
                  </div>

                  {match.status === "confirmed" ? (
                    <Button
                      onClick={() => onChatOpen(match.id, match.spot_id)}
                      className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={16} />
                      Chat & Coordinate
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAction(match.id, "confirm")}
                        disabled={actionLoading === match.id || myConfirmed}
                        className="flex-1 h-10 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold flex items-center justify-center gap-1.5"
                      >
                        {actionLoading === match.id ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Check size={16} />
                        )}
                        {myConfirmed ? "Confirmed" : "Confirm"}
                      </Button>
                      <Button
                        onClick={() => handleAction(match.id, "reject")}
                        disabled={actionLoading === match.id}
                        variant="outline"
                        className="h-10 rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <X size={16} />
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {confirmedMatches.length > 0 && (
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2 mt-4">Confirmed</p>
            {confirmedMatches.map((match) => {
              const isOwner = userId === match.spot_owner_id;
              const otherUser = isOwner ? match.seeker : match.spot_owner;

              return (
                <div
                  key={match.id}
                  className="bg-white dark:bg-zinc-900 border border-green-200 dark:border-green-800 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                        <Check size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold truncate max-w-[200px]">
                          {match.spot.address || "Parking spot"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {match.spot.departure_time && formatDate(match.spot.departure_time)} &middot;{" "}
                          {match.spot.departure_time && formatTime(match.spot.departure_time)} &ndash;{" "}
                          {match.spot.return_time && formatTime(match.spot.return_time)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <UserIcon size={14} />
                    <span>{otherUser?.name || "Driver"}</span>
                    {otherUser?.vehicle_type && (
                      <>
                        <span className="text-zinc-300">|</span>
                        <Car size={14} />
                        <span>{otherUser.vehicle_type}</span>
                      </>
                    )}
                  </div>

                  <Button
                    onClick={() => onChatOpen(match.id, match.spot_id)}
                    className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={16} />
                    Chat & Coordinate
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
