namespace Homework.Journeys;

/// <summary>一次喂养的领域结果（美术资源由 App 层按新阶查图鉴补全）。</summary>
public readonly record struct JourneyFeedResult(bool Evolved, int NewLevel, bool Completed);
