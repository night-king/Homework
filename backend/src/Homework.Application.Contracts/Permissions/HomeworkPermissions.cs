namespace Homework.Permissions;

public static class HomeworkPermissions
{
    public const string GroupName = "Homework";

    /// <summary>Single gate for all parent-admin features.</summary>
    public const string ParentAdmin = GroupName + ".ParentAdmin";

    /// <summary>平台管理员：全局图鉴维护。</summary>
    public static class Catalog
    {
        public const string Default = GroupName + ".Catalog";
        public const string Pets = Default + ".Pets";
        public const string RewardItems = Default + ".RewardItems";
        public const string Medals = Default + ".Medals";
    }
}
