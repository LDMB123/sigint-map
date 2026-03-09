#[cfg(feature = "hydrate")]
pub(crate) fn default_worker_max_floats_for_profile(
    device_memory_gb: Option<f64>,
    cores: usize,
    is_apple_silicon: bool,
) -> usize {
    let device_memory_gb = device_memory_gb.unwrap_or(0.0);
    if is_apple_silicon {
        if device_memory_gb >= 16.0 || cores >= 10 {
            5_000_000
        } else if device_memory_gb >= 8.0 || cores >= 8 {
            3_500_000
        } else if device_memory_gb >= 4.0 {
            2_000_000
        } else {
            1_200_000
        }
    } else if device_memory_gb >= 16.0 || cores >= 12 {
        4_000_000
    } else if device_memory_gb >= 8.0 || cores >= 8 {
        2_500_000
    } else if device_memory_gb >= 4.0 {
        1_500_000
    } else {
        900_000
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn default_worker_threshold_for_profile(
    device_memory_gb: Option<f64>,
    cores: usize,
    is_apple_silicon: bool,
) -> usize {
    let device_memory_gb = device_memory_gb.unwrap_or(0.0);
    if is_apple_silicon {
        if device_memory_gb >= 16.0 || cores >= 10 {
            12_000
        } else if device_memory_gb >= 8.0 || cores >= 8 {
            20_000
        } else if device_memory_gb <= 4.0 || cores <= 4 {
            45_000
        } else {
            28_000
        }
    } else if device_memory_gb >= 16.0 || cores >= 12 {
        15_000
    } else if device_memory_gb <= 4.0 || cores <= 4 {
        60_000
    } else if device_memory_gb >= 8.0 || cores >= 8 {
        25_000
    } else {
        35_000
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn default_matrix_cache_max_bytes_for_profile(
    device_memory_gb: Option<f64>,
    cores: usize,
    is_apple_silicon: bool,
) -> u32 {
    const MIB_U32: u32 = 1024 * 1024;
    let device_memory_gb = device_memory_gb.unwrap_or(0.0);
    if is_apple_silicon {
        if device_memory_gb >= 16.0 || cores >= 10 {
            32 * MIB_U32
        } else if device_memory_gb >= 8.0 || cores >= 8 {
            24 * MIB_U32
        } else if device_memory_gb <= 4.0 || cores <= 4 {
            8 * MIB_U32
        } else {
            16 * MIB_U32
        }
    } else if device_memory_gb >= 16.0 || cores >= 12 {
        16 * MIB_U32
    } else if device_memory_gb >= 8.0 || cores >= 8 {
        12 * MIB_U32
    } else if device_memory_gb <= 4.0 || cores <= 4 {
        4 * MIB_U32
    } else {
        8 * MIB_U32
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn default_result_cache_max_bytes_for_profile(
    device_memory_gb: Option<f64>,
    cores: usize,
    is_apple_silicon: bool,
) -> u32 {
    const KIB_U32: u32 = 1024;
    const MIB_U32: u32 = 1024 * KIB_U32;
    let device_memory_gb = device_memory_gb.unwrap_or(0.0);
    if is_apple_silicon {
        if device_memory_gb >= 16.0 || cores >= 10 {
            8 * MIB_U32
        } else if device_memory_gb >= 8.0 || cores >= 8 {
            4 * MIB_U32
        } else if device_memory_gb <= 4.0 || cores <= 4 {
            MIB_U32
        } else {
            2 * MIB_U32
        }
    } else if device_memory_gb >= 16.0 || cores >= 12 {
        4 * MIB_U32
    } else if device_memory_gb >= 8.0 || cores >= 8 {
        2 * MIB_U32
    } else if device_memory_gb <= 4.0 || cores <= 4 {
        512 * KIB_U32
    } else {
        MIB_U32
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn default_cache_idle_ms_for_profile(
    device_memory_gb: Option<f64>,
    cores: usize,
    is_apple_silicon: bool,
) -> u32 {
    let device_memory_gb = device_memory_gb.unwrap_or(0.0);
    if is_apple_silicon {
        if device_memory_gb >= 16.0 || cores >= 10 {
            30_000
        } else if device_memory_gb >= 8.0 || cores >= 8 {
            20_000
        } else if device_memory_gb <= 4.0 || cores <= 4 {
            5_000
        } else {
            12_000
        }
    } else if device_memory_gb >= 16.0 || cores >= 12 {
        15_000
    } else if device_memory_gb >= 8.0 || cores >= 8 {
        10_000
    } else if device_memory_gb <= 4.0 || cores <= 4 {
        5_000
    } else {
        8_000
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn default_prime_matrix_on_worker_init_for_profile(
    device_memory_gb: Option<f64>,
    cores: usize,
    is_apple_silicon: bool,
) -> bool {
    let device_memory_gb = device_memory_gb.unwrap_or(0.0);
    is_apple_silicon && device_memory_gb > 4.0 && cores > 4
}
