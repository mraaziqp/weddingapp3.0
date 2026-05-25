import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const DEFAULTS = {
  partner1Short: 'Abdu-Raazig',
  partner2Short: 'Razia',
  partner1Full: 'Abdu-Raazig Sarber',
  partner2Full: 'Razia Shade',
  date: '06.09.2026',
  dateVerbose: 'Saturday, 6th September 2026',
  venue: 'The Grand Pavilion',
  city: 'Cape Town',
  bgImage: '/couple-bg.jpg',
  siteBgImage: '/site-bg.jpg',
  redirectToStd: true,
};

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('std_config')
      .select('config')
      .eq('id', 'main')
      .single();

    if (error || !data || !data.config) {
      return NextResponse.json({
        config: DEFAULTS,
        designState: null
      });
    }

    const dbConfig = data.config as Record<string, any>;
    const { designState, ...restConfig } = dbConfig;

    const config = { ...DEFAULTS, ...restConfig };
    return NextResponse.json({
      config,
      designState: designState || null
    });
  } catch (err) {
    console.error('[STD config] GET error:', err);
    return NextResponse.json({
      config: DEFAULTS,
      designState: null
    });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { config: clientConfig, designState } = body;

    // Fetch existing first to merge safely
    let existingConfig: Record<string, any> = {};
    try {
      const { data } = await supabaseAdmin
        .from('std_config')
        .select('config')
        .eq('id', 'main')
        .single();
      if (data?.config) {
        existingConfig = data.config as Record<string, any>;
      }
    } catch {
      // ignore
    }

    const { designState: oldDesign, ...oldConfig } = existingConfig;

    // Merge standard configs
    const mergedConfig = { ...DEFAULTS, ...oldConfig, ...clientConfig };

    // Package both standard config and design state into the single 'config' JSONB column
    // This is extremely robust and avoids missing-column database errors!
    const finalDbPayload = {
      ...mergedConfig,
      designState: designState || oldDesign || null
    };

    const { error } = await supabaseAdmin
      .from('std_config')
      .upsert({
        id: 'main',
        config: finalDbPayload,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.warn('[STD config] Supabase upsert failed:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, config: mergedConfig, designState });
  } catch (err) {
    console.error('[STD config] PUT error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
