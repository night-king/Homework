namespace Homework.Permissions;

public static class HomeworkPermissions
{
    public const string GroupName = "Homework";

    /// <summary>Single gate for all parent-admin features.</summary>
    public const string ParentAdmin = GroupName + ".ParentAdmin";
}
