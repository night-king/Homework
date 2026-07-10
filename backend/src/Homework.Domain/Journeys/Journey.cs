using System;
using System.Collections.Generic;
using System.Linq;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Journeys;

/// <summary>一段旅程：按孩子维度，绑定一个宠物实例与一枚勋章；喂养驱动五阶进化，满级即完成。</summary>
public class Journey : FullAuditedAggregateRoot<Guid>
{
    public const int MaxLevel = 5;

    public Guid ParentId { get; private set; }
    public Guid ChildId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public DateOnly StartDate { get; private set; }
    public DateOnly EndDate { get; private set; }
    public Guid MedalId { get; private set; }
    public JourneyStatus Status { get; private set; }
    public Guid? PetSpeciesId { get; private set; }
    public int CurrentLevel { get; private set; }
    public int GrowthPoints { get; private set; }
    public DateTime? CompletedTime { get; private set; }

    private readonly List<JourneyPetStage> _stages = new();
    public IReadOnlyCollection<JourneyPetStage> Stages => _stages.AsReadOnly();

    private readonly List<JourneyBackpackItem> _backpack = new();
    public IReadOnlyCollection<JourneyBackpackItem> Backpack => _backpack.AsReadOnly();

    protected Journey() { }

    public Journey(Guid id, Guid parentId, Guid childId, [NotNull] string title,
        DateOnly startDate, DateOnly endDate, Guid medalId) : base(id)
    {
        ParentId = parentId;
        ChildId = childId;
        SetTitle(title);
        SetPeriod(startDate, endDate);
        MedalId = medalId;
        Status = JourneyStatus.Draft;
        CurrentLevel = 1;
        GrowthPoints = 0;
    }

    public Journey SetTitle([NotNull] string title)
    {
        Title = Check.NotNullOrWhiteSpace(title, nameof(title), maxLength: 128);
        return this;
    }

    public Journey SetDescription(string? description)
    {
        Description = description;
        return this;
    }

    public Journey SetPeriod(DateOnly startDate, DateOnly endDate)
    {
        if (endDate < startDate)
        {
            throw new ArgumentException("endDate must be >= startDate", nameof(endDate));
        }

        StartDate = startDate;
        EndDate = endDate;
        return this;
    }

    public Journey SetMedal(Guid medalId)
    {
        MedalId = medalId;
        return this;
    }

    /// <summary>孩子开始旅程：选定宠物 + 快照 5 阶阈值；仅 Draft 可开始。</summary>
    public void Start(Guid petSpeciesId, IEnumerable<(int Level, int? GrowthToNext)> stages)
    {
        if (Status != JourneyStatus.Draft)
        {
            throw new BusinessException(HomeworkDomainErrorCodes.JourneyNotDraft);
        }

        PetSpeciesId = petSpeciesId;
        _stages.Clear();
        foreach (var (level, growthToNext) in stages.OrderBy(s => s.Level))
        {
            _stages.Add(new JourneyPetStage(Id, level, growthToNext));
        }

        Status = JourneyStatus.Active;
        CurrentLevel = 1;
        GrowthPoints = 0;
    }

    internal JourneyPetStage? CurrentStage() => _stages.FirstOrDefault(s => s.Level == CurrentLevel);
}
