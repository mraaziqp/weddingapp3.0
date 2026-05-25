import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
  redirectToStd: true,
};

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('std_config')
      .select('config, design_state')
      .eq('id', 'main')
      .single();

    if (error || !data) {
      return NextResponse.json({
        config: DEFAULTS,
        designState: null
      });
    }

    const config = { ...DEFAULTS, ...(data.config as object) };
    return NextResponse.json({
      config,
      designState: data.design_state || null
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

    // Fetch existing first to merge
    let existingConfig = {};
    try {
      const { data } = await supabase
        .from('std_config')
        .select('config')
        .eq('id', 'main')
        .single();
      if (data?.config) {
        existingConfig = data.config;
      }
    } catch {
      // ignore
    }

    const mergedConfig = { ...DEFAULTS, ...existingConfig, ...clientConfig };

    const { error } = await supabase
      .from('std_config')
      .upsert({
        id: 'main',
        config: mergedConfig,
        design_state: designState || null,
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
