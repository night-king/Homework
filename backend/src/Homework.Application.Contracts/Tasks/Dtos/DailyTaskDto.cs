using System;
using Volo.Abp.Application.Dtos;

namespace Homework.Tasks.Dtos;
// TaskReviewState is in Homework.Tasks (Domain.Shared) — same parent namespace, no explicit using needed

public class DailyTaskDto : EntityDto<Guid>
{
    public Guid ChildId { get; set; }
    public DateOnly Date { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public int? EstimatedMinutes { get; set; }
    public int Order { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedTime { get; set; }
    public TaskReviewState ReviewState { get; set; }
    public bool CountsAsCompleted { get; set; }
    public Guid? SourceTemplateItemId { get; set; }
    public Guid JourneyId { get; set; }
    public Guid? RewardItemId { get; set; }
    public bool RewardGranted { get; set; }

    /// <summary>
    /// 以下三个奖励展示字段(RewardName / RewardGlyph / RewardIconUrl)只由看板端点
    /// (GetDailyBoardAsync)反范式化填充；任务变更类接口(CompleteTaskAsync /
    /// UncompleteTaskAsync,以及家长端 DailyTaskAppService 的看板/新建/更新等路径)
    /// 返回的同一个 DTO 里这三个字段始终为 null。消费方要拿奖励名必须去看板取,
    /// 不能从变更接口的返回值里读。
    /// </summary>
    public string? RewardName { get; set; }
    public string? RewardGlyph { get; set; }
    public string? RewardIconUrl { get; set; }
}
