namespace Homework;

public static class HomeworkRoles
{
    public const string Parent = "Parent"; // 家长；本项目直接复用 admin，Parent 留作语义/扩展
    public const string Child = "Child";   // 孩子：仅能访问自己的游戏数据
}
