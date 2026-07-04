using System.Threading.Tasks;
using Homework.Localization;
using Homework.MultiTenancy;
using Homework.Permissions;
using Volo.Abp.Identity.Web.Navigation;
using Volo.Abp.SettingManagement.Web.Navigation;
using Volo.Abp.TenantManagement.Web.Navigation;
using Volo.Abp.UI.Navigation;

namespace Homework.Web.Menus;

public class HomeworkMenuContributor : IMenuContributor
{
    public async Task ConfigureMenuAsync(MenuConfigurationContext context)
    {
        if (context.Menu.Name == StandardMenus.Main)
        {
            await ConfigureMainMenuAsync(context);
        }
    }

    private async Task ConfigureMainMenuAsync(MenuConfigurationContext context)
    {
        var administration = context.Menu.GetAdministration();
        var l = context.GetLocalizer<HomeworkResource>();

        context.Menu.Items.Insert(
            0,
            new ApplicationMenuItem(
                HomeworkMenus.Home,
                l["Menu:Home"],
                "~/",
                icon: "fas fa-home",
                order: 0
            )
        );

        if (MultiTenancyConsts.IsEnabled)
        {
            administration.SetSubItemOrder(TenantManagementMenuNames.GroupName, 1);
        }
        else
        {
            administration.TryRemoveMenuItem(TenantManagementMenuNames.GroupName);
        }

        administration.SetSubItemOrder(IdentityMenuNames.GroupName, 2);
        administration.SetSubItemOrder(SettingManagementMenuNames.GroupName, 3);

        if (await context.IsGrantedAsync(HomeworkPermissions.ParentAdmin))
        {
            var parentAdmin = new ApplicationMenuItem(
                HomeworkMenus.ParentAdmin, l["Menu:ParentAdmin"], icon: "fas fa-user-shield", order: 1);
            parentAdmin.AddItem(new ApplicationMenuItem(
                HomeworkMenus.Children, l["Menu:Children"], "/ParentAdmin/Children"));
            parentAdmin.AddItem(new ApplicationMenuItem(
                HomeworkMenus.WeeklyTemplates, l["Menu:WeeklyTemplates"], "/ParentAdmin/WeeklyTemplates"));
            parentAdmin.AddItem(new ApplicationMenuItem(
                HomeworkMenus.DailyTasks, l["Menu:DailyTasks"], "/ParentAdmin/DailyTasks"));
            parentAdmin.AddItem(new ApplicationMenuItem(
                HomeworkMenus.FamilyGoals, l["Menu:FamilyGoals"], "/ParentAdmin/FamilyGoals"));
            context.Menu.AddItem(parentAdmin);
        }
    }
}
