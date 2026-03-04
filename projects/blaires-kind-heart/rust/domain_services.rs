use crate::{
    companion, mom_mode, parent_insights, rewards, skill_progression, state::AppState, streaks,
    weekly_goals,
};
use std::cell::RefCell;
use std::rc::Rc;

pub fn award_kind_act_sticker() {
    rewards::award_sticker("kind-act");
}

pub fn award_sticker(source: &str) {
    rewards::award_sticker(source);
}

pub fn notify_sticker_earned() {
    companion::on_sticker_earned();
}

pub fn award_mastery_sticker(sticker_type: &str, source: &str) {
    rewards::award_mastery_sticker(sticker_type, source);
}

pub fn award_streak_sticker(streak_days: u32) {
    rewards::award_streak_sticker(streak_days);
}

pub fn award_goal_sticker(goal_sticker: &str) {
    rewards::award_goal_sticker(goal_sticker);
}

pub fn on_quest_complete() {
    companion::on_quest_complete();
}

pub fn on_story_complete() {
    companion::on_story_complete();
}

pub fn celebrate_reflection() {
    companion::celebrate_reflection();
}

pub fn record_streak_today(state: Rc<RefCell<AppState>>) {
    streaks::record_today(state);
}

pub fn increment_weekly_goal_progress(goal_type: &str, amount: u32) {
    weekly_goals::increment_progress(goal_type, amount);
}

pub fn refresh_weekly_goals() {
    weekly_goals::refresh_goals();
}

pub async fn track_skill_practice(skill: &str) {
    skill_progression::track_skill_practice(skill).await;
}

pub async fn render_mastery_indicators() {
    skill_progression::render_mastery_indicators().await;
}

pub async fn get_parent_pin() -> Option<String> {
    mom_mode::get_parent_pin().await
}

pub fn current_week_key() -> String {
    parent_insights::current_week_key()
}

pub async fn get_weekly_insights(week_key: &str) -> Option<parent_insights::WeeklyInsight> {
    parent_insights::get_weekly_insights(week_key).await
}

pub async fn get_focus_skill() -> Option<String> {
    skill_progression::get_focus_skill().await
}

pub fn skill_to_friendly_name(skill: &str) -> String {
    skill_progression::skill_to_friendly_name(skill).to_string()
}
