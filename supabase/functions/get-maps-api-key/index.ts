import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🗝️ Getting Google Maps API key...');
    
    // List all environment variables for debugging
    console.log('🔍 Available env vars:', Object.keys(Deno.env.toObject()));

    // Get the Google Maps API key from environment
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    console.log('🗝️ API key found:', apiKey ? 'Yes' : 'No');
    console.log('🗝️ API key length:', apiKey?.length || 0);

    if (!apiKey) {
      console.error('❌ Google Maps API key not configured');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    console.log('✅ Returning API key');
    return new Response(
      JSON.stringify({ apiKey }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  }
})