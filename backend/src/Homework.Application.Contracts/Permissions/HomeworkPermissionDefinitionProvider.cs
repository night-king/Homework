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

        var catalog = myGroup.AddPermission(HomeworkPermissions.Catalog.Default, L("Permission:Catalog"));
        catalog.AddChild(HomeworkPermissions.Catalog.Pets, L("Permission:Catalog.Pets"));
        catalog.AddChild(HomeworkPermissions.Catalog.RewardItems, L("Permission:Catalog.RewardItems"));
        catalog.AddChild(HomeworkPermissions.Catalog.Medals, L("Permission:Catalog.Medals"));
    }

    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<HomeworkResource>(name);
    }
}
