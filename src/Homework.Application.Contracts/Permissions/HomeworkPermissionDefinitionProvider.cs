using Homework.Localization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Localization;

namespace Homework.Permissions;

public class HomeworkPermissionDefinitionProvider : PermissionDefinitionProvider
{
    public override void Define(IPermissionDefinitionContext context)
    {
        var myGroup = context.AddGroup(HomeworkPermissions.GroupName);
        //Define your own permissions here. Example:
        //myGroup.AddPermission(HomeworkPermissions.MyPermission1, L("Permission:MyPermission1"));
    }

    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<HomeworkResource>(name);
    }
}
