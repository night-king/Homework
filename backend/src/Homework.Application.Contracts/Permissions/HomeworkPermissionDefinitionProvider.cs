using Homework.Localization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Localization;

namespace Homework.Permissions;

public class HomeworkPermissionDefinitionProvider : PermissionDefinitionProvider
{
    public override void Define(IPermissionDefinitionContext context)
    {
        var myGroup = context.AddGroup(HomeworkPermissions.GroupName, L("Permission:Homework"));
        myGroup.AddPermission(HomeworkPermissions.ParentAdmin, L("Permission:ParentAdmin"));
    }

    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<HomeworkResource>(name);
    }
}
