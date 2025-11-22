use anchor_lang::prelude::*;

declare_id!("Dimi111111111111111111111111111111111111111");

#[program]
pub mod dimi {
    use super::*;

    pub fn init_config(ctx: Context<InitConfig>, admin: Pubkey) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.admin = admin;
        cfg.bump = *ctx.bumps.get("config").unwrap();
        Ok(())
    }

    pub fn register_user(ctx: Context<RegisterUser>, display_name: String, roles: u8) -> Result<()> {
        require!(display_name.as_bytes().len() <= 32, DimiError::NameTooLong);
        let user = &mut ctx.accounts.user;
        user.authority = ctx.accounts.authority.key();
        user.roles = roles;
        user.created_at = Clock::get()?.unix_timestamp;
        user.next_beat_id = 0;
        user.display_name = display_name;
        Ok(())
    }

    pub fn set_roles(ctx: Context<SetRoles>, roles: u8) -> Result<()> {
        require!(ctx.accounts.authority.key() == ctx.accounts.config.admin, DimiError::Unauthorized);
        ctx.accounts.user.roles = roles;
        Ok(())
    }

    pub fn beat_create(
        ctx: Context<BeatCreate>,
        title: String,
        bpm: u16,
        musical_key: [u8; 8],
        tags: Vec<[u8; 16]>,
        uri: String,
        content_hash: [u8; 32],
        content_type: [u8; 16],
        byte_len: u32,
    ) -> Result<()> {
        require!(has_role(ctx.accounts.user.roles, Role::Producer), DimiError::Unauthorized);
        require!(title.as_bytes().len() <= 64, DimiError::TitleTooLong);
        require!(uri.as_bytes().len() <= 200, DimiError::UriTooLong);
        require!(tags.len() <= 6, DimiError::TooManyTags);

        let beat = &mut ctx.accounts.beat;
        beat.owner = ctx.accounts.authority.key();
        beat.beat_id = ctx.accounts.user.next_beat_id;
        beat.bpm = bpm;
        beat.shared = false;
        beat.archived = false;
        beat.byte_len = byte_len;
        beat.created_at = Clock::get()?.unix_timestamp;
        beat.updated_at = beat.created_at;
        beat.musical_key = musical_key;
        beat.content_hash = content_hash;
        beat.content_type = content_type;
        beat.title = title;
        beat.uri = uri;
        beat.tags = tags;

        // increment owner's counter
        ctx.accounts.user.next_beat_id = ctx.accounts.user.next_beat_id.checked_add(1).ok_or(DimiError::Overflow)?;
        Ok(())
    }

    pub fn beat_update(ctx: Context<BeatUpdate>, maybe: BeatUpdateArgs) -> Result<()> {
        let b = &mut ctx.accounts.beat;
        require!(b.owner == ctx.accounts.authority.key(), DimiError::Unauthorized);
        if let Some(title) = maybe.title { require!(title.as_bytes().len() <= 64, DimiError::TitleTooLong); b.title = title; }
        if let Some(bpm) = maybe.bpm { b.bpm = bpm; }
        if let Some(k) = maybe.musical_key { b.musical_key = k; }
        if let Some(tags) = maybe.tags { require!(tags.len() <= 6, DimiError::TooManyTags); b.tags = tags; }
        if let Some(uri) = maybe.uri { require!(uri.as_bytes().len() <= 200, DimiError::UriTooLong); b.uri = uri; }
        if let Some(hash) = maybe.content_hash { b.content_hash = hash; }
        if let Some(ct) = maybe.content_type { b.content_type = ct; }
        if let Some(len) = maybe.byte_len { b.byte_len = len; }
        b.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn beat_toggle_shared(ctx: Context<BeatOwner>, shared: bool) -> Result<()> {
        let b = &mut ctx.accounts.beat;
        require!(b.owner == ctx.accounts.authority.key(), DimiError::Unauthorized);
        b.shared = shared;
        b.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn beat_archive(ctx: Context<BeatOwner>) -> Result<()> {
        let b = &mut ctx.accounts.beat;
        require!(b.owner == ctx.accounts.authority.key(), DimiError::Unauthorized);
        b.archived = true;
        b.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn track_create(
        ctx: Context<TrackCreate>,
        take: u16,
        uri: String,
        content_hash: [u8; 32],
        content_type: [u8; 16],
        byte_len: u32,
    ) -> Result<()> {
        require!(has_role(ctx.accounts.user.roles, Role::Artist), DimiError::Unauthorized);
        let beat = &ctx.accounts.beat;
        require!(beat.shared || beat.owner == ctx.accounts.authority.key(), DimiError::BeatNotShared);
        require!(!beat.archived, DimiError::BeatArchived);
        require!(uri.as_bytes().len() <= 200, DimiError::UriTooLong);

        let track = &mut ctx.accounts.track;
        track.beat = ctx.accounts.beat.key();
        track.artist = ctx.accounts.authority.key();
        track.take = take;
        track.uri = uri;
        track.content_hash = content_hash;
        track.content_type = content_type;
        track.byte_len = byte_len;
        track.created_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn track_delete(_ctx: Context<TrackDelete>) -> Result<()> {
        // account will be closed to authority by context constraint
        Ok(())
    }
}

// -------------------- Accounts & Types --------------------
#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(init, payer = authority, space = 8 + Config::INIT_SPACE, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(init, payer = authority, space = 8 + User::INIT_SPACE, seeds = [b"user", authority.key().as_ref()], bump)]
    pub user: Account<'info, User>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetRoles<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [b"user", user.authority.as_ref()], bump)]
    pub user: Account<'info, User>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct BeatCreate<'info> {
    #[account(mut, seeds = [b"user", authority.key().as_ref()], bump)]
    pub user: Account<'info, User>,
    #[account(
        init, payer = authority, space = 8 + Beat::INIT_SPACE,
        seeds = [b"beat", authority.key().as_ref(), &user.next_beat_id.to_le_bytes()],
        bump
    )]
    pub beat: Account<'info, Beat>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct BeatUpdateArgs {
    pub title: Option<String>,
    pub bpm: Option<u16>,
    pub musical_key: Option<[u8; 8]>,
    pub tags: Option<Vec<[u8; 16]>>,
    pub uri: Option<String>,
    pub content_hash: Option<[u8; 32]>,
    pub content_type: Option<[u8; 16]>,
    pub byte_len: Option<u32>,
}

#[derive(Accounts)]
pub struct BeatUpdate<'info> {
    #[account(mut)]
    pub beat: Account<'info, Beat>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct BeatOwner<'info> {
    #[account(mut)]
    pub beat: Account<'info, Beat>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(take: u16)]
pub struct TrackCreate<'info> {
    #[account(mut, seeds = [b"user", authority.key().as_ref()], bump)]
    pub user: Account<'info, User>,
    pub beat: Account<'info, Beat>,
    #[account(
        init, payer = authority, space = 8 + Track::INIT_SPACE,
        seeds = [b"track", beat.key().as_ref(), authority.key().as_ref(), &take.to_le_bytes()],
        bump
    )]
    pub track: Account<'info, Track>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TrackDelete<'info> {
    #[account(mut, close = authority)]
    pub track: Account<'info, Track>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub bump: u8,
}
impl Config {
    pub const INIT_SPACE: usize = 32 + 1;
}

#[account]
pub struct User {
    pub authority: Pubkey,     // 32
    pub roles: u8,             // 1
    pub created_at: i64,       // 8
    pub next_beat_id: u16,     // 2
    pub display_name: String,  // <= 32
}
impl User {
    pub const INIT_SPACE: usize = 32 + 1 + 8 + 2 + 4 + 32;
}

#[account]
pub struct Beat {
    pub owner: Pubkey,         // 32 (offset 8..40)
    pub beat_id: u16,          // 2  (40..42)
    pub bpm: u16,              // 2  (42..44)
    pub shared: bool,          // 1  (44) <-- memcmp target
    pub archived: bool,        // 1  (45)
    pub byte_len: u32,         // 4  (46..50)
    pub created_at: i64,       // 8  (50..58)
    pub updated_at: i64,       // 8  (58..66)
    pub musical_key: [u8; 8],  // 8
    pub content_hash: [u8; 32],
    pub content_type: [u8; 16],
    pub title: String,         // <= 64
    pub uri: String,           // <= 200
    pub tags: Vec<[u8; 16]>,   // <= 6
}
impl Beat {
    pub const INIT_SPACE: usize = 32 + 2 + 2 + 1 + 1 + 4 + 8 + 8 + 8 + 32 + 16
        + (4 + 64) + (4 + 200) + (4 + (6 * 16));
}

#[account]
pub struct Track {
    pub beat: Pubkey,               // 32
    pub artist: Pubkey,             // 32
    pub take: u16,                  // 2
    pub uri: String,                // <= 200
    pub content_hash: [u8; 32],     // 32
    pub content_type: [u8; 16],     // 16
    pub byte_len: u32,              // 4
    pub created_at: i64,            // 8
}
impl Track {
    pub const INIT_SPACE: usize = 32 + 32 + 2 + (4 + 200) + 32 + 16 + 4 + 8;
}

#[repr(u8)]
pub enum Role { Admin=1, Producer=2, Artist=4 }
fn has_role(mask: u8, role: Role) -> bool { mask & (role as u8) != 0 }

#[error_code]
pub enum DimiError {
    #[msg("Unauthorized")] Unauthorized,
    #[msg("Name too long")] NameTooLong,
    #[msg("Title too long")] TitleTooLong,
    #[msg("URI too long")] UriTooLong,
    #[msg("Too many tags")] TooManyTags,
    #[msg("Beat is not shared")] BeatNotShared,
    #[msg("Beat archived")] BeatArchived,
    #[msg("Overflow")] Overflow,
}