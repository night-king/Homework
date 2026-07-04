namespace Homework.Tasks;

/// <summary>每日任务的复核状态。Revoked = 家长撤销的异常打卡，记分时视为未完成。</summary>
public enum TaskReviewState : byte
{
    Normal = 0,
    Revoked = 1
}
