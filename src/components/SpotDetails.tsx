"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, CheckCircle2, DollarSign, X, Clock, Car, MessageSquare, AlertTriangle, UserCircle, Star, Shield } from "lucide-react";
import { useLeavingTimer } from "@/hooks/useLeavingTimer";
import { useExpirationTimer } from "@/hooks/useExpirationTimer";
import { claimSpot, sendTip } from "@/lib/api-client";
import { createEphemeralChat } from "@/actions/social";
import { createBrowserClient } from "@/lib/supabaseClient";
import { AdBanner } from "./AdBanner";
import type { Spot } from "@/hooks/useRealtimeSpots";
import { getVehicleTypeLabel } from "@/lib/vehicle-types";
import { FlagSpotModal } from "./FlagSpotModal";
import { RatingModal } from "./RatingModal";
import { SpotExpirationCountdown } from "./SpotExpirationCountdown";
import { RankBadge } from "./RankBadge";
import type { RankTier } from "@/lib/ranking";

interface SpotDetailsProps {
  spot: Spot;
  onClose: () => void;
  onChatStart?: (chatId: string, spot: Spot) => void;
}

export function SpotDetails({ spot, onClose, onChatStart }: SpotDetailsProps) {
  const supabase = createBrowserClient();
  const { formatted, isExpired } = useLeavingTimer(spot.departure_time);
  const expTimer = useExpirationTimer(spot.expires_at ?? spot.departure_time);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isTipping, setIsTipping] = useState(false);
  const [tipAmount, setTipAmount] = useState<number | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [ownerRating, setOwnerRating] = useState<number | null>(null);
  const [ownerRank, setOwnerRank] = useState<{ rank_tier: string; trust_score: number } | null>(null);

  // Flag & rating modals
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [claimedUserId, setClaimedUserId] = useState<string | null>(null);
  const [flagCount, setFlagCount] = useState<number>(spot.flag_count ?? 0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    Promise.all([
      (supabase as any).from("users").select("name, average_rating").eq("id", spot.user_id).maybeSingle(),
      (supabase as any).from("user_ranking").select("rank_tier, trust_score").eq("user_id", spot.user_id).maybeSingle(),
    ]).then(([userRes, rankRes]: any[]) => {
      if (userRes.data) {
        setOwnerName(userRes.data.name);
        setOwnerRating(userRes.data.average_rating);
      }
      if (rankRes.data) {
        setOwnerRank(rankRes.data);
      }
    });
  }, [spot.user_id]);

  const handleStartChat = async () => {
    if (!currentUserId) return;
    setIsStartingChat(true);
    const result = await createEphemeralChat(spot.id, currentUserId);
    setIsStartingChat(false);
    if (result.chat) {
      onChatStart?.(result.chat.id, spot);
    } else {
      alert(result.error || "Failed to start chat");
    }
  };

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`;
    window.open(url, "_blank");
  };

  const handleClaimSpot = async () => {
    setIsClaiming(true);
    try {
      const { error } = await claimSpot(spot.id);
      if (error) {
        alert(error);
        return;
      }
      setIsSuccess(true);
      setClaimedUserId(currentUserId);
      // Show rating prompt after claiming
      setTimeout(() => {
        if (currentUserId) {
          setShowRatingModal(true);
        }
      }, 1000);
    } catch (err) {
      console.error("Error claiming spot:", err);
      alert("Failed to claim spot. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  };

  const handleSendTip = async () => {
    if (!tipAmount) return;
    try {
      const { error } = await sendTip(spot.id, tipAmount);
      if (error) {
        alert(error);
        return;
      }
      setIsTipping(false);
      setTipAmount(null);
      alert(`Sent $${tipAmount} tip!`);
    } catch (err) {
      console.error("Error sending tip:", err);
    }
  };

  const handleCancelSpot = async () => {
    if (!confirm("Cancel this spot alert? It will be removed from the map.")) return;
    try {
      const res = await fetch(`/api/spots/${spot.id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      onClose();
    } catch {
      alert("Failed to cancel spot");
    }
  };

  const isOwner = currentUserId === spot.user_id;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Spot Details</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700">
          <X size={24} />
        </button>
      </div>

      {isSuccess ? (
        <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mb-4">
            <CheckCircle2 size={48} />
          </div>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Spot Claimed!</h3>
          <p className="text-zinc-500 text-center mt-2">Happy parking. Remember to pay it forward!</p>
        </div>
      ) : (
        <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
          <div className="flex items-center gap-3">
            <Clock className="text-blue-600" size={24} />
            <div>
              <p className="text-sm text-blue-600 font-medium">
                {isExpired ? "Now departing" : "Departs in"}
              </p>
              <p className="text-2xl font-black text-blue-700 dark:text-blue-400">
                {isExpired ? "Now" : formatted}
              </p>
              {spot.return_time && (
                <p className="text-xs text-blue-500 mt-0.5">
                  Returns by {new Date(spot.return_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          </div>
          <SpotExpirationCountdown
            expiresAt={spot.expires_at ?? spot.departure_time}
            onExpired={() => {}}
            onCancel={isOwner ? handleCancelSpot : undefined}
            showCancel={isOwner}
          />
        </div>
        {flagCount > 0 && (
          <div className="px-1 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle size={12} />
            This alert has been flagged {flagCount} time{flagCount > 1 ? "s" : ""}
          </div>
        )}

        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 px-1">
          <MapPin size={18} />
          <p className="text-sm font-medium">{spot.address}</p>
        </div>

        {!isOwner && ownerName && (
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 px-1">
            <UserCircle size={18} />
            <p className="text-sm font-medium">{ownerName}</p>
            {ownerRank && (
              <RankBadge tier={ownerRank.rank_tier as RankTier} size="sm" showLabel={false} />
            )}
            {ownerRating !== null && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full text-amber-700 font-medium flex items-center gap-0.5 ml-auto">
                <Star size={10} /> {ownerRating.toFixed(1)}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 px-1">
          <Car size={18} />
          <p className="text-sm font-medium">Fits: {getVehicleTypeLabel(spot.vehicle_type)}</p>
        </div>

        {spot.lead_minutes && (
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 px-1">
            <Clock size={14} />
            <p className="text-xs font-medium">
              Alert expires in ~{spot.lead_minutes} min{spot.lead_minutes > 1 ? "s" : ""}
            </p>
          </div>
        )}

        {spot.tip_message && (
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl italic text-sm text-zinc-600 dark:text-zinc-300">
            &quot;{spot.tip_message}&quot;
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" onClick={handleGetDirections} className="h-12 px-1 text-xs">
            <Navigation className="mr-1 h-4 w-4" />
            Directions
          </Button>
          {currentUserId && currentUserId !== spot.user_id && onChatStart && (
            <Button
              variant="outline"
              onClick={handleStartChat}
              disabled={isStartingChat}
              className="h-12 px-1 text-xs"
            >
              <MessageSquare className="mr-1 h-4 w-4" />
              Chat
            </Button>
          )}
          {currentUserId && currentUserId !== spot.user_id && (
            <Button onClick={handleClaimSpot} disabled={isClaiming} className="h-12 px-1 text-xs bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Take Spot
            </Button>
          )}
          {/* Flag button */}
          {currentUserId && currentUserId !== spot.user_id && (
            <Button
              variant="outline"
              onClick={() => setShowFlagModal(true)}
              className="h-12 px-1 text-xs text-red-500 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <AlertTriangle className="mr-1 h-4 w-4" />
              Report
            </Button>
          )}
        </div>

        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
          {!isTipping ? (
            <Button variant="outline" onClick={() => setIsTipping(true)} className="w-full h-12 text-zinc-600">
              <DollarSign className="mr-2 h-4 w-4" />
              Send a Thank You Tip
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-bold text-center">Select Tip Amount</p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 5].map((amount) => (
                  <Button
                    key={amount}
                    variant={tipAmount === amount ? "default" : "outline"}
                    onClick={() => setTipAmount(amount)}
                    className="h-10"
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsTipping(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSendTip} disabled={!tipAmount} className="flex-2 bg-blue-600">Send</Button>
              </div>
            </div>
          )}
        </div>

        <AdBanner latitude={spot.latitude} longitude={spot.longitude} />
      </div>
      </>
      )}

      {/* Flag Spot Modal */}
      <FlagSpotModal
        open={showFlagModal}
        spotId={spot.id}
        onClose={() => setShowFlagModal(false)}
      />

      {/* Rating Modal after claiming */}
      <RatingModal
        open={showRatingModal}
        ratedUserId={spot.user_id}
        spotId={spot.id}
        onClose={() => { setShowRatingModal(false); onClose(); }}
      />
    </div>
  );
}
