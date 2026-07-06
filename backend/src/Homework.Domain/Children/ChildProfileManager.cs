using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;
using Volo.Abp.Users;

namespace Homework.Children;

/// <summary>家庭归属校验：当前登录家长只能碰自己名下的孩子。</summary>
public class ChildProfileManager : DomainService
{
    private readonly IRepository<ChildProfile, Guid> _repository;
    private readonly ICurrentUser _currentUser;

    public ChildProfileManager(
        IRepository<ChildProfile, Guid> repository,
        ICurrentUser currentUser)
    {
        _repository = repository;
        _currentUser = currentUser;
    }

    private Guid CurrentParentId => _currentUser.Id
        ?? throw new AbpException("User not authenticated.");

    /// <summary>取当前家长名下的孩子；不属于则当作不存在。</summary>
    public async Task<ChildProfile> GetOwnedAsync(Guid childId)
    {
        var child = await _repository.FindAsync(childId);
        if (child == null || child.ParentId != CurrentParentId)
        {
            throw new EntityNotFoundException(typeof(ChildProfile), childId);
        }

        return child;
    }

    /// <summary>校验某 childId 属于当前家长（按实体 id 的写操作前置校验用）。</summary>
    public Task EnsureChildOwnedAsync(Guid childId) => GetOwnedAsync(childId);

    /// <summary>当前家长名下所有 childId。</summary>
    public async Task<List<Guid>> GetOwnedChildIdsAsync()
    {
        var children = await _repository.GetListAsync(c => c.ParentId == CurrentParentId);
        return children.Select(c => c.Id).ToList();
    }
}
