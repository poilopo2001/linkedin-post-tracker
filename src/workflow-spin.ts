import { run, Runner } from "@openai/agents";
import { readFileSync } from "fs";
import {
  postAnalyzerAgent,
  angleGeneratorAgent,
  postWriterAgent,
  humanizerAgent
} from "./agents-spin.js";
import type {
  SpinRequest,
  PostAnalysisResult,
  AngleGenerationResult,
  DraftGenerationResult,
  RevisionResult,
  SpinResult
} from "./schemas-spin.js";

const MAX_HUMANIZATION_ITERATIONS = 3;
const MIN_AUTHENTICITY_SCORE = 85;
const MIN_ORIGINALITY_SCORE = 70;

/**
 * Spin Workflow - Multi-agent post transformation
 *
 * Pipeline:
 * 1. Post Analyzer → Deep analysis of original post
 * 2. Angle Generator → Generate creative angles
 * 3. Post Writer → Write human-sounding post
 * 4. Humanizer → Remove AI patterns (iterate if needed)
 */
export async function spinPost(request: SpinRequest): Promise<SpinResult> {
  console.log("\n[SPIN] Starting Spin Workflow...");
  console.log(`[SPIN] Original post by: ${request.original_post.author_name}`);
  console.log(`[SPIN] Company: ${request.company_profile.company_name}`);

  let iterationsCount = 0;

  try {
    // ============ STEP 1: Deep Analysis ============
    console.log("\n[STEP 1] Analyzing original post...");

    const analysisPrompt = `Analyse ce post LinkedIn en profondeur:

POST ORIGINAL:
"""
${request.original_post.content}
"""

METRIQUES:
- Likes: ${request.original_post.likes}
- Comments: ${request.original_post.comments}
- Shares: ${request.original_post.shares}

Fais une analyse COMPLETE: structure, hook, theme universel, ce qui fonctionne, et ce qu'il ne faut PAS copier.`;

    const analysisResult = await run(postAnalyzerAgent, analysisPrompt);
    const analysis = analysisResult.finalOutput as PostAnalysisResult;

    console.log(`[OK] Analysis complete:`);
    console.log(`   - Hook type: ${analysis.hook_type}`);
    console.log(`   - Structure: ${analysis.structure_type}`);
    console.log(`   - Theme: ${analysis.universal_theme}`);
    console.log(`   - Adaptability: ${analysis.adaptability_score}/100`);

    // ============ STEP 2: Generate Angles ============
    console.log("\n[STEP 2] Generating creative angles...");

    const anglePrompt = `Genere des angles ORIGINAUX pour ce theme.

ANALYSE DU POST ORIGINAL:
- Theme universel: ${analysis.universal_theme}
- Message central: ${analysis.core_message}
- Hook original: ${analysis.hook_type}
- Structure originale: ${analysis.structure_type}
- Drivers d'engagement: ${analysis.engagement_drivers.join(", ")}

PROFIL ENTREPRISE:
- Nom: ${request.company_profile.company_name}
- Secteur: ${request.company_profile.industry}
- Ton: ${request.company_profile.tone_of_voice.join(", ")}
- Messages cles: ${request.company_profile.key_messages.join(", ")}
- Valeurs: ${request.company_profile.values.join(", ")}
${request.company_profile.differentiators ? `- Differenciateurs: ${request.company_profile.differentiators.join(", ")}` : ""}

CONTRAINTES:
- L'angle doit etre DIFFERENT de l'original (pas la meme structure, pas le meme hook)
- Doit correspondre au profil de l'entreprise
- Doit avoir un fort potentiel d'engagement

${request.spin_options.angle_preference ? `PREFERENCE: ${request.spin_options.angle_preference}` : ""}

Genere 3 a 5 angles audacieux et originaux.`;

    const angleResult = await run(angleGeneratorAgent, anglePrompt);
    const angles = angleResult.finalOutput as AngleGenerationResult;

    const selectedAngle = angles.angles[angles.recommended_angle_index];
    console.log(`[OK] Generated ${angles.angles.length} angles`);
    console.log(`   - Selected: "${selectedAngle.angle_name}"`);
    console.log(`   - Originality: ${selectedAngle.originality_score}/100`);
    console.log(`   - Relevance: ${selectedAngle.relevance_to_company}/100`);

    // ============ STEP 3: Write Post ============
    console.log("\n[STEP 3] Writing post...");

    const writePrompt = `Ecris un post LinkedIn ORIGINAL et HUMAIN.

THEME: ${analysis.universal_theme}
MESSAGE CENTRAL: ${analysis.core_message}

ANGLE CHOISI: ${selectedAngle.angle_name}
- Description: ${selectedAngle.angle_description}
- Differentiation: ${selectedAngle.differentiation}
- Idee d'accroche: ${selectedAngle.hook_idea}

PROFIL ENTREPRISE:
- Nom: ${request.company_profile.company_name}
- Secteur: ${request.company_profile.industry}
- Ton souhaite: ${request.spin_options.tone}
- Messages cles: ${request.company_profile.key_messages.join(", ")}

REGLES ABSOLUES:
- NO AI PATTERNS (pas de "Dans un monde ou...", "Il est essentiel...", etc.)
- Sonne 100% HUMAIN
- Phrases de longueurs variees
- Point de vue personnel
- ${request.spin_options.include_cta ? "Inclure un CTA naturel a la fin" : "Pas de CTA"}

Ecris le post maintenant.`;

    const writeResult = await run(postWriterAgent, writePrompt);
    let draft = writeResult.finalOutput as DraftGenerationResult;
    iterationsCount++;

    // Validation du draft
    if (!draft || typeof draft !== 'object') {
      console.log(`[ERROR] Invalid draft output: ${typeof draft}`);
      throw new Error("Post writer returned invalid output");
    }

    console.log(`[OK] Draft written:`);
    console.log(`   - Authenticity: ${draft.authenticity_score ?? 'N/A'}/100`);
    console.log(`   - Originality: ${draft.originality_score ?? 'N/A'}/100`);
    console.log(`   - AI patterns detected: ${draft.ai_patterns_detected?.length ?? 0}`);
    // Force flush
    process.stdout.write('');

    // ============ STEP 4: Humanize (if needed) ============
    console.log(`[STEP 4] Checking if humanization needed...`);

    // S'assurer que les valeurs par défaut existent
    draft.ai_patterns_detected = draft.ai_patterns_detected || [];
    draft.weaknesses = draft.weaknesses || [];
    draft.hashtags = draft.hashtags || [];

    let finalContent = draft.draft_content;
    let finalAuthenticityScore = draft.authenticity_score || 0;
    let finalOriginalityScore = draft.originality_score || 0;
    let passedAiCheck = !draft.needs_revision && draft.ai_patterns_detected.length === 0;

    console.log(`   - needs_revision: ${draft.needs_revision}`);
    console.log(`   - passedAiCheck: ${passedAiCheck}`);

    while (
      (draft.needs_revision || finalAuthenticityScore < MIN_AUTHENTICITY_SCORE) &&
      iterationsCount < MAX_HUMANIZATION_ITERATIONS
    ) {
      console.log(`\n[STEP 4] Humanizing (iteration ${iterationsCount})...`);
      console.log(`   - Reason: ${draft.needs_revision ? "AI patterns detected" : "Low authenticity score"}`);

      const humanizePrompt = `Humanise ce post LinkedIn pour eliminer TOUS les patterns AI.

POST ACTUEL:
"""
${finalContent}
"""

PATTERNS AI DETECTES:
${draft.ai_patterns_detected.map(p => `- ${p}`).join("\n")}

FAIBLESSES IDENTIFIEES:
${draft.weaknesses.map(w => `- ${w}`).join("\n")}

OBJECTIF:
- Authenticity score >= ${MIN_AUTHENTICITY_SCORE}
- Aucun pattern AI
- Le post doit passer le test "est-ce qu'un humain dirait ca?"

Reecris le post en le rendant 100% humain.`;

      const humanizeResult = await run(humanizerAgent, humanizePrompt);
      const revision = humanizeResult.finalOutput as RevisionResult;
      iterationsCount++;

      finalContent = revision.revised_content;
      finalAuthenticityScore = revision.final_authenticity_score;
      finalOriginalityScore = revision.final_originality_score;
      passedAiCheck = revision.ready_to_publish;

      console.log(`[OK] Revision ${iterationsCount - 1} complete:`);
      console.log(`   - Changes: ${revision.changes_made.length}`);
      console.log(`   - Authenticity: ${finalAuthenticityScore}/100`);
      console.log(`   - Ready to publish: ${passedAiCheck}`);

      if (passedAiCheck) break;

      // Update draft for next iteration if needed
      draft = {
        ...draft,
        draft_content: finalContent,
        authenticity_score: finalAuthenticityScore,
        originality_score: finalOriginalityScore,
        needs_revision: !passedAiCheck,
        ai_patterns_detected: [],
        weaknesses: []
      };
    }

    // ============ Final Result ============
    const passedPlagiarismCheck = finalOriginalityScore >= MIN_ORIGINALITY_SCORE;

    console.log("\n[DONE] Spin Workflow Complete!");
    console.log(`   - Iterations: ${iterationsCount}`);
    console.log(`   - Passed AI check: ${passedAiCheck}`);
    console.log(`   - Passed plagiarism check: ${passedPlagiarismCheck}`);

    return {
      success: true,
      analysis,
      angles_generated: angles.angles.length,
      selected_angle: selectedAngle.angle_name,
      final_post: {
        content: finalContent,
        hashtags: draft.hashtags,
        authenticity_score: finalAuthenticityScore,
        originality_score: finalOriginalityScore,
        predicted_engagement: draft.predicted_engagement
      },
      passed_ai_check: passedAiCheck,
      passed_plagiarism_check: passedPlagiarismCheck,
      iterations_count: iterationsCount,
      error: null
    };

  } catch (error) {
    console.error("[ERROR] Spin workflow failed:", error);
    return {
      success: false,
      analysis: null,
      angles_generated: 0,
      selected_angle: null,
      final_post: null,
      passed_ai_check: false,
      passed_plagiarism_check: false,
      iterations_count: iterationsCount,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// Helper to read from stdin
async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

// CLI entry point - only runs when executed directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
    process.argv[1]?.includes('workflow-spin')) {
  const args = process.argv.slice(2);
  const useStdin = args.includes('--stdin');
  const fileIndex = args.indexOf('--file');
  const useFile = fileIndex !== -1 && args[fileIndex + 1];

  const runWorkflow = async () => {
    let requestJson: string;

    if (useFile) {
      // Read JSON from file
      const filePath = args[fileIndex + 1];
      requestJson = readFileSync(filePath, 'utf-8');
    } else if (useStdin) {
      // Read JSON from stdin
      requestJson = await readStdin();
    } else if (args.length > 0 && !args[0].startsWith('--')) {
      // Read from command line argument
      requestJson = args[0];
    } else {
      console.error("Usage: npx tsx workflow-spin.ts '<json>' | --stdin | --file <path>");
      process.exit(1);
      return;
    }

    try {
      const request: SpinRequest = JSON.parse(requestJson);
      const result = await spinPost(request);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("Failed to parse request:", error);
      process.exit(1);
    }
  };

  runWorkflow().catch(error => {
    console.error("Workflow failed:", error);
    process.exit(1);
  });
}
