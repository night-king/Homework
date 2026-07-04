using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Homework.Permissions;
using Homework.Scoring.Dtos;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Users;

namespace Homework.Scoring;

[Authorize(HomeworkPermissions.ParentAdmin)]
public class FamilyGoalAppService : HomeworkAppService, IFamilyGoalAppService
{
    private readonly IRepository<FamilyGoal, Guid> _repository;
    private readonly FamilyGoalProgressService _progress;

    public FamilyGoalAppService(IRepository<FamilyGoal, Guid> repository, FamilyGoalProgressService progress)
    {
        _repository = repository;
        _progress = progress;
    }

    public async Task<ListResultDto<FamilyGoalDto>> GetListAsync()
    {
        var pid = CurrentUser.GetId();
        var goals = await _repository.GetListAsync(g => g.ParentId == pid);
        var dtos = new List<FamilyGoalDto>();
        foreach (var g in goals.OrderBy(g => g.StartDate))
        {
            dtos.Add(await MapWithProgressAsync(g));
        }
        return new ListResultDto<FamilyGoalDto>(dtos);
    }

    public async Task<FamilyGoalDto> GetAsync(Guid id)
        => await MapWithProgressAsync(await GetOwnedGoalAsync(id));

    public async Task<FamilyGoalDto> CreateAsync(CreateUpdateFamilyGoalDto input)
    {
        var goal = new FamilyGoal(GuidGenerator.Create(), CurrentUser.GetId(), input.Title, input.TargetStars, input.StartDate, input.EndDate, input.RewardText);
        await _repository.InsertAsync(goal, autoSave: true);
        return await MapWithProgressAsync(goal);
    }

    public async Task<FamilyGoalDto> UpdateAsync(Guid id, CreateUpdateFamilyGoalDto input)
    {
        var goal = await GetOwnedGoalAsync(id);
        goal.SetTitle(input.Title);
        goal.SetTarget(input.TargetStars);
        goal.SetPeriod(input.StartDate, input.EndDate);
        goal.SetRewardText(input.RewardText);
        await _repository.UpdateAsync(goal, autoSave: true);
        return await MapWithProgressAsync(goal);
    }

    public async Task DeleteAsync(Guid id)
    {
        var goal = await GetOwnedGoalAsync(id);
        await _repository.DeleteAsync(goal);
    }

    private async Task<FamilyGoal> GetOwnedGoalAsync(Guid id)
    {
        var g = await _repository.FindAsync(id);
        if (g == null || g.ParentId != CurrentUser.GetId())
            throw new EntityNotFoundException(typeof(FamilyGoal), id);
        return g;
    }

    private async Task<FamilyGoalDto> MapWithProgressAsync(FamilyGoal goal)
    {
        var stars = await _progress.CalculateStarsAsync(goal);
        if (goal.CheckAchieved(stars, Clock.Now))
        {
            await _repository.UpdateAsync(goal);
        }
        return new FamilyGoalDto
        {
            Id = goal.Id,
            Title = goal.Title,
            TargetStars = goal.TargetStars,
            RewardText = goal.RewardText,
            StartDate = goal.StartDate,
            EndDate = goal.EndDate,
            AchievedTime = goal.AchievedTime,
            CurrentStars = stars,
            IsAchieved = goal.AchievedTime != null,
            ProgressPercent = goal.TargetStars == 0 ? 0 : Math.Min(100, (int)(stars * 100L / goal.TargetStars))
        };
    }
}
