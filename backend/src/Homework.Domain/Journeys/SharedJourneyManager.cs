using System;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;
using Volo.Abp.Users;

namespace Homework.Journeys;

/// <summary>共享计划的建单与家庭归属校验：当前登录家长只能碰自己名下的共享计划。</summary>
public class SharedJourneyManager : DomainService
{
    private readonly IRepository<SharedJourney, Guid> _repository;
    private readonly ICurrentUser _currentUser;

    public SharedJourneyManager(
        IRepository<SharedJourney, Guid> repository,
        ICurrentUser currentUser)
    {
        _repository = repository;
        _currentUser = currentUser;
    }

    private Guid CurrentParentId => _currentUser.Id
        ?? throw new AbpException("User not authenticated.");

    /// <summary>当前家长新建一份共享计划（Draft）。</summary>
    public async Task<SharedJourney> CreateAsync(
        string title, string? description,
        DateOnly startDate, DateOnly endDate, Guid medalId)
    {
        var sharedJourney = new SharedJourney(
            GuidGenerator.Create(), CurrentParentId, title, startDate, endDate, medalId);
        sharedJourney.SetDescription(description);
        return await _repository.InsertAsync(sharedJourney, autoSave: true);
    }

    /// <summary>取当前家长名下的共享计划；不属于则当作不存在。</summary>
    public async Task<SharedJourney> GetOwnedAsync(Guid id)
    {
        var sharedJourney = await _repository.FindAsync(id);
        if (sharedJourney == null || sharedJourney.ParentId != CurrentParentId)
        {
            throw new EntityNotFoundException(typeof(SharedJourney), id);
        }

        return sharedJourney;
    }
}
