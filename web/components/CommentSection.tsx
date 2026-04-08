import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  AiFillDislike,
  AiFillHeart,
  AiOutlineDislike,
  AiOutlineHeart,
} from "react-icons/ai";
import { BiCommentDetail, BiSortAlt2 } from "react-icons/bi";
import { MdDelete, MdEdit, MdMoreVert, MdVerified } from "react-icons/md";
import { DEFAULT_AVATAR_SRC, getHeaderAvatarSrc } from "../libs/displayAvatar";
import { useAppSelector } from "../store/index";

interface Reply {
  id: string;
  content: string;
  userName: string;
  userAvatar?: string;
  userId: string;
  status?: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  likes: number;
  dislikes: number;
  likedBy: string[];
  dislikedBy: string[];
}

interface Comment {
  id: string;
  content: string;
  userName: string;
  userAvatar?: string;
  userId: string;
  status?: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  likes: number;
  dislikes: number;
  likedBy: string[];
  dislikedBy: string[];
  replies?: Reply[];
  replyCount?: number;
}

interface CommentSectionProps {
  movieId: string;
}

interface CommentItemProps {
  comment: Comment;
  movieId: string;
  currentUserId?: string;
  isAdmin?: boolean;
  onLikeDislike: (commentId: string, action: "like" | "dislike") => void;
  onReplyAdded: () => void;
  getAvatar: (userName: string, userAvatar?: string | null) => JSX.Element;
  formatDate: (dateString: string) => string;
  isReply?: boolean;
}

const sortOptions = [
  { value: "top", label: "Hàng đầu" },
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
] as const;

const CommentSection: React.FC<CommentSectionProps> = ({ movieId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<"newest" | "top" | "oldest">("top");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const currentUser = useAppSelector((state) => state.profile.profile);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await axios.get("/api/comments/check-auth");
        setIsAdmin(response.data.isAdmin || false);
      } catch (error) {
        console.log("User is not admin");
      }
    };
    checkAdminStatus();
  }, []);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await axios.get(`/api/comments/${movieId}?sort=${sortBy}&limit=50`);
      setComments(response.data.comments || []);
      setTotal(response.data.total || 0);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.error || "Không thể tải bình luận. Vui lòng thử lại.");
      setComments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [movieId, sortBy]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newComment.trim() || submitting) return;

    try {
      setSubmitting(true);
      await axios.post("/api/comments/create", {
        content: newComment.trim(),
        movieId,
      });
      setNewComment("");
      setSuccessMessage("Đã đăng bình luận!");
      if (sortBy !== "newest") {
        setSortBy("newest");
      } else {
        fetchComments();
      }
      window.setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error: any) {
      alert(error.response?.data?.error || "Không thể đăng bình luận. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeDislike = async (commentId: string, action: "like" | "dislike") => {
    try {
      const response = await axios.post("/api/comments/like", { commentId, action });
      const updated = response.data || {};

      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              ...updated,
              likedBy: Array.isArray(updated.likedBy) ? updated.likedBy : comment.likedBy || [],
              dislikedBy: Array.isArray(updated.dislikedBy) ? updated.dislikedBy : comment.dislikedBy || [],
              replies: Array.isArray(comment.replies) ? comment.replies : [],
              replyCount:
                typeof comment.replyCount === "number"
                  ? comment.replyCount
                  : Array.isArray(comment.replies)
                    ? comment.replies.length
                    : 0,
            };
          }

          if (!Array.isArray(comment.replies)) return comment;

          return {
            ...comment,
            replies: comment.replies.map((reply) => {
              if (reply.id !== commentId) return reply;
              return {
                ...reply,
                ...updated,
                likedBy: Array.isArray(updated.likedBy) ? updated.likedBy : reply.likedBy || [],
                dislikedBy: Array.isArray(updated.dislikedBy) ? updated.dislikedBy : reply.dislikedBy || [],
              };
            }),
          };
        })
      );
    } catch (error) {
      console.error("Error updating like/dislike:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMins < 1) return "vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 30) return `${diffDays} ngày trước`;
    if (diffMonths < 12) return `${diffMonths} tháng trước`;
    return `${diffYears} năm trước`;
  };

  const getAvatar = (userName: string, userAvatar?: string | null) => {
    return (
      <img
        src={getHeaderAvatarSrc(userAvatar) || DEFAULT_AVATAR_SRC}
        alt={userName}
        className="h-full w-full object-cover"
      />
    );
  };

  return (
    <section className="mt-10 mb-16 px-4 md:px-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/35">Thảo luận</p>
            <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">{total} bình luận</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/45">
              Chia sẻ suy nghĩ, góc nhìn và cảm xúc của bạn về bộ phim này.
            </p>
          </div>

          <div className="relative self-start md:self-auto">
            <button
              type="button"
              onClick={() => setShowSortMenu((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/80 transition hover:bg-white/[0.08] hover:text-white"
            >
              <BiSortAlt2 className="text-lg" />
              <span>{sortOptions.find((option) => option.value === sortBy)?.label}</span>
            </button>

            {showSortMenu ? (
              <div className="absolute right-0 top-full z-20 mt-2 min-w-[180px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 py-2 shadow-2xl backdrop-blur">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSortBy(option.value);
                      setShowSortMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition ${
                      sortBy === option.value
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 hover:bg-white/6 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mb-8 rounded-[26px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
          <div className="flex gap-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
              {getAvatar(currentUser?.name || "User", currentUser?.image)}
            </div>

            <form onSubmit={handleSubmitComment} className="min-w-0 flex-1">
              <textarea
                rows={2}
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                placeholder="Viết bình luận của bạn tại đây..."
                className="w-full resize-none border-b border-white/12 bg-transparent px-0 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/35 focus:border-white/25"
                disabled={submitting}
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-white/45">
                  {successMessage ? (
                    <span className="text-emerald-400">{successMessage}</span>
                  ) : (
                    "Rõ ràng, tôn trọng và mang tính xây dựng. Nhấn nút Đăng để gửi."
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {newComment.trim() ? (
                    <button
                      type="button"
                      onClick={() => setNewComment("")}
                      className="rounded-full px-4 py-2 text-sm font-medium text-white/65 transition hover:bg-white/8 hover:text-white"
                      disabled={submitting}
                    >
                      Hủy
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Đang gửi..." : "Đăng"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-white" />
          </div>
        ) : errorMessage ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/8 px-5 py-6 text-center text-sm text-red-300">
            {errorMessage}
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-3xl border border-white/8 bg-white/[0.02] px-5 py-10 text-center">
            <p className="text-lg text-white/70">Chưa có bình luận nào</p>
            <p className="mt-2 text-sm text-white/45">Hãy là người mở màn cho cuộc trò chuyện này.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                movieId={movieId}
                currentUserId={currentUser?.id}
                isAdmin={isAdmin}
                onLikeDislike={handleLikeDislike}
                onReplyAdded={fetchComments}
                getAvatar={getAvatar}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  movieId,
  currentUserId,
  isAdmin = false,
  onLikeDislike,
  onReplyAdded,
  getAvatar,
  formatDate,
  isReply = false,
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [showMenu, setShowMenu] = useState(false);

  const isLiked = Boolean(currentUserId && comment.likedBy?.includes(currentUserId));
  const isDisliked = Boolean(currentUserId && comment.dislikedBy?.includes(currentUserId));
  const isOwner = currentUserId === comment.userId;
  const canDelete = isOwner || isAdmin;
  const canEdit = isOwner;
  const likeCountLabel = comment.likes > 0 ? String(comment.likes) : "";
  const dislikeCountLabel = comment.dislikes > 0 ? String(comment.dislikes) : "";
  const replyCount = typeof comment.replyCount === "number" ? comment.replyCount : Array.isArray(comment.replies) ? comment.replies.length : 0;

  const handleSubmitReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!replyText.trim() || submitting) return;

    try {
      setSubmitting(true);
      console.log('Submitting reply with parentId:', comment.id, 'movieId:', movieId);
      const response = await axios.post("/api/comments/reply", {
        content: replyText.trim(),
        movieId,
        parentId: comment.id,
      });
      console.log('Reply created:', response.data);
      setReplyText("");
      setShowReplyForm(false);
      setShowReplies(true);
      onReplyAdded();
    } catch (error: any) {
      console.error('Error submitting reply:', error.response?.data || error.message);
      alert(error.response?.data?.error || "Không thể gửi phản hồi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editText.trim() || submitting) return;

    try {
      setSubmitting(true);
      await axios.patch("/api/comments/edit", {
        commentId: comment.id,
        content: editText.trim(),
      });
      setIsEditing(false);
      onReplyAdded();
    } catch (error: any) {
      alert(error.response?.data?.error || "Không thể chỉnh sửa bình luận");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa bình luận này?")) return;

    try {
      setSubmitting(true);
      await axios.delete(`/api/comments/delete?commentId=${comment.id}`);
      onReplyAdded();
    } catch (error: any) {
      alert(error.response?.data?.error || "Không thể xóa bình luận");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={isReply ? "ml-7 border-l border-white/10 pl-4 md:ml-12 md:pl-5" : ""}>
      <article className="group flex gap-3 py-4 md:gap-4 md:py-5">
        <div
          className={`overflow-hidden rounded-full ring-1 ring-white/10 ${
            isReply ? "mt-1 h-8 w-8 shrink-0" : "mt-1 h-10 w-10 shrink-0"
          }`}
        >
          {getAvatar(comment.userName, comment.userAvatar)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-white">{comment.userName}</span>
                {isAdmin && !isOwner && (
                  <span className="rounded-full bg-blue-400/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-blue-300 flex items-center gap-1">
                    <MdVerified className="text-xs" />
                    Quản trị viên
                  </span>
                )}
                {comment.status === "pending" ? (
                  <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-300">
                    Chờ duyệt
                  </span>
                ) : null}
                {comment.updatedAt !== comment.createdAt ? (
                  <span className="text-[11px] text-white/35">đã chỉnh sửa</span>
                ) : null}
              </div>
            </div>

            {(canDelete || canEdit) && !isEditing ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowMenu((prev) => !prev)}
                  className="rounded-full p-1.5 text-white/35 transition hover:bg-white/8 hover:text-white"
                  title="Tùy chọn"
                >
                  <MdMoreVert className="text-lg" />
                </button>
                {showMenu ? (
                  <div className="absolute right-0 top-full z-20 mt-2 min-w-[150px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 py-1 shadow-2xl backdrop-blur">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white/80 transition hover:bg-white/8 hover:text-white"
                      >
                        <MdEdit className="text-base" />
                        Chỉnh sửa
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          handleDelete();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                      >
                        <MdDelete className="text-base" />
                        Xóa
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {isEditing ? (
            <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <textarea
                rows={3}
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
                className="w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-white/35"
                placeholder="Chỉnh sửa bình luận..."
                disabled={submitting}
              />
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(comment.content);
                  }}
                  className="rounded-full px-4 py-2 text-sm text-white/60 transition hover:bg-white/8 hover:text-white"
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleEdit}
                  disabled={submitting || !editText.trim()}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-white break-words whitespace-pre-wrap">{comment.content}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/45">
            <span>{formatDate(comment.createdAt)}</span>

            {!isReply ? (
              <button
                type="button"
                onClick={() => setShowReplyForm((prev) => !prev)}
                className="font-medium text-white/45 transition hover:text-white/85"
              >
                Trả lời
              </button>
            ) : null}

            {!isReply && replyCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowReplies((prev) => !prev)}
                className="font-medium text-white/45 transition hover:text-white/85"
              >
                {showReplies ? `Ẩn ${replyCount} phản hồi` : `Xem ${replyCount} phản hồi`}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => onLikeDislike(comment.id, "dislike")}
              className="inline-flex items-center gap-1 text-white/35 transition hover:text-white/75"
            >
              {isDisliked ? <AiFillDislike className="text-sm" /> : <AiOutlineDislike className="text-sm" />}
              <span>{dislikeCountLabel || "Không thích"}</span>
            </button>
          </div>

          {showReplyForm ? (
            <form onSubmit={handleSubmitReply} className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <textarea
                rows={2}
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Viết phản hồi của bạn..."
                className="w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-white/35"
                disabled={submitting}
                autoFocus
              />
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyText("");
                  }}
                  className="rounded-full px-4 py-2 text-sm text-white/60 transition hover:bg-white/8 hover:text-white"
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting || !replyText.trim()}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "..." : "Gửi"}
                </button>
              </div>
            </form>
          ) : null}

          {showReplies && Array.isArray(comment.replies) && comment.replies.length > 0 ? (
            <div className="mt-4 space-y-0 divide-y divide-white/10">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  movieId={movieId}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onLikeDislike={onLikeDislike}
                  onReplyAdded={onReplyAdded}
                  getAvatar={getAvatar}
                  formatDate={formatDate}
                  isReply
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex w-12 shrink-0 flex-col items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onLikeDislike(comment.id, "like")}
            className="rounded-full p-2 text-white/45 transition hover:bg-white/8 hover:text-white"
            aria-label={isLiked ? "Bỏ tim bình luận" : "Tim bình luận"}
          >
            {isLiked ? <AiFillHeart className="text-[20px] text-white" /> : <AiOutlineHeart className="text-[20px]" />}
          </button>
          <span className="min-h-[16px] text-[11px] leading-4 text-white/45">{likeCountLabel}</span>

          {!isReply ? (
            <button
              type="button"
              onClick={() => setShowReplyForm((prev) => !prev)}
              className="rounded-full p-2 text-white/30 transition hover:bg-white/8 hover:text-white/80"
              aria-label="Mở khung trả lời"
            >
              <BiCommentDetail className="text-[18px]" />
            </button>
          ) : null}
        </div>
      </article>
    </div>
  );
};

export default CommentSection;
