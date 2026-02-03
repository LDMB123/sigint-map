#!/bin/bash

# Dive Bar Concepts 1-30 Image Generation Script
# Generates all 30 Veo video prompts sequentially with 75-second delays

set -e

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Counters
TOTAL_CONCEPTS=30
COMPLETED=0
FAILED=0
START_TIME=$(date +%s)

# Function to print progress
print_progress() {
  local current=$1
  local total=$2
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}Concept $current/$total${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
}

# Function to handle errors
handle_error() {
  local concept_num=$1
  local error_msg=$2
  echo -e "${RED}✗ Concept $concept_num FAILED: $error_msg${NC}"
  FAILED=$((FAILED + 1))
}

# Function to execute a prompt
execute_prompt() {
  local concept_num=$1
  local prompt=$2

  print_progress $concept_num $TOTAL_CONCEPTS

  echo "Sending prompt to Veo..."

  if node veo-direct.js "$prompt" 2>/dev/null; then
    echo -e "${GREEN}✓ Concept $concept_num completed successfully${NC}"
    COMPLETED=$((COMPLETED + 1))
  else
    handle_error $concept_num "Prompt execution failed"
  fi

  # Wait 75 seconds between concepts (except after the last one)
  if [ $concept_num -lt $TOTAL_CONCEPTS ]; then
    echo "Waiting 75 seconds before next concept..."
    sleep 75
  fi

  echo ""
}

# ============================================================================
# CONCEPT 1
# ============================================================================
PROMPT_1=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s inside Ego's Lounge on South Congress in Austin, Texas. She is seated on a cracked red vinyl bar stool, body angled three-quarters to camera left, face turned toward the lens with direct eye contact. She wears a black leather mini dress with a square neckline and cap sleeves that catches light in irregular streaks across the material. The dress hits mid-thigh. Her legs are bare, crossed at the ankles, feet in black pointed-toe stilettos with scuffed soles visible. Her dark brown hair is straight, parted cleanly in the middle, falling just past her shoulders with a few strands catching the light.

She fills approximately 75% of the frame. Her expression is a confident smirk, the left corner of her mouth pulled slightly higher than the right, eyes narrowed just enough to suggest amusement. Her skin has a light sheen of perspiration across her forehead and collarbones. A small dark mole sits above her right eyebrow. Fine lines are visible at the corners of her eyes.

The primary light source is a Lone Star beer neon sign mounted on the wood-paneled wall behind her and to camera right, casting a warm amber-red glow across the right side of her face and shoulder. A single bare incandescent bulb hangs from a cord above the bar to camera left, providing a dim secondary fill that catches the edge of her jaw and left ear. The background shows a cluttered bar top with half-empty pint glasses, a plastic tip jar, and a stack of cardboard coasters. A blurred figure in a flannel shirt leans against the far end of the bar.

Shot on a Canon EOS R5 with a Canon RF 50mm f/1.2L USM lens at f/1.4. ISO 4000, shutter speed 1/80s. White balance intentionally set too warm at approximately 4200K, pushing skin tones into golden-amber territory. The image is underexposed by roughly one stop, crushing shadow detail under the bar and in the far corners. Heavy natural vignetting darkens the frame edges. Visible grain structure consistent with high ISO digital noise. Slight chromatic aberration appears as magenta fringing along the high-contrast edge where her shoulder meets the neon glow. Bokeh in the background shows slight onion-ring artifacts from the aspherical lens element. The depth of field is razor thin, with her near eye tack sharp and her far ear already softening.

Her eyes are placed on the upper-right rule of thirds intersection. Camera is positioned at her seated eye level. The composition feels like a snapshot taken by a friend who borrowed an expensive camera for the night.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 2
# ============================================================================
PROMPT_2=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s standing inside the back room of Hole in the Wall on Guadalupe Street in Austin, Texas. She leans against a peeling concert poster-covered wall, body angled three-quarters to camera right, chin tilted slightly down with eyes looking up directly into the lens. She wears an emerald green crushed velvet mini dress with a deep V-neckline and fitted long sleeves that bunch slightly at the wrists. The velvet catches light unevenly, showing darker and lighter patches where the nap is pressed in different directions. The dress ends several inches above her knees. She wears black sheer thigh-high stockings with delicate lace tops just barely visible at the hem of the dress, the sheer material catching pinpoints of reflected light along her shins. Black suede ankle-strap heels.

Her dark auburn hair is wildly tousled, waves going in competing directions as if she has been running her hands through it all night. Several pieces fall across her left eye and she has not bothered to push them away. The rest cascades unevenly over her shoulders, some strands tucked behind one ear, others not.

She fills roughly 78% of the frame. Her expression is serious and direct, lips slightly parted, brows relaxed but eyes intensely focused. A dusting of freckles crosses the bridge of her nose and upper cheeks. Her lipstick, a muted berry shade, has worn slightly off the center of her lower lip.

The primary light source is a strand of warm Edison bulbs strung diagonally across the ceiling behind her, creating a line of soft orbs in the out-of-focus background. A purple neon open sign in a distant window casts a faint cool wash across the left edge of the frame. Her face is lit predominantly from camera right by the spill from an unseen hallway, creating a natural rembrandt triangle of light on her left cheek.

Shot on a Nikon Z6 III with a Nikkor Z 85mm f/1.2 S lens at f/1.4. ISO 5000, shutter speed 1/60s. White balance set warm at approximately 3800K. Underexposed by one stop, with deep shadows swallowing the corners. Prominent film-like grain throughout. Mild barrel distortion from shooting relatively close with an 85mm. Chromatic aberration shows as green-magenta fringing on the bright Edison bulbs in the bokeh. The shallow depth of field renders the poster text behind her as illegible colored smears. Slight lens flare from the Edison bulbs creates a faint warm streak across the upper left corner.

Eyes placed on the upper-left rule of thirds intersection. Camera is positioned slightly below her eye level, angled up by roughly five degrees. The image feels like a spontaneous shot taken by a friend between conversations.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 3
# ============================================================================
PROMPT_3=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s inside Nickel City bar on East Cesar Chavez in Austin, Texas. She sits in a worn brown leather booth, body angled three-quarters to camera left, one arm resting along the top of the booth back. She wears a hot pink satin mini dress with an asymmetric one-shoulder design, the fabric catching and reflecting light in broad glossy patches, with visible wrinkles where the material bunches at her waist from sitting. The dress hits mid-thigh. She wears cream-colored suede knee-high boots with a stacked wooden heel, the suede showing slight scuff marks and darkened patches near the toes.

Her black hair is sleek and swept entirely over her right shoulder, exposing the bare left shoulder and the clean line of her neck. A small hoop earring catches a glint of light on the exposed ear.

She fills approximately 72% of the frame. Her expression is a soft, genuine half-smile, eyes warm with slight crow's feet crinkling at the outer corners. Her teeth are just barely visible. A faint scar interrupts her left eyebrow. Her skin has visible texture and slight unevenness in tone across her cheeks.

The primary light source is a vintage pool table lamp hanging low in the middle distance behind her and to camera right, its green glass shade casting a cone of warm downward light that illuminates the edge of her hair and right shoulder from behind. A Miller High Life neon sign on the far wall provides a secondary golden glow. The booth itself is in relative shadow, with only ambient spill lighting her face. The background shows a partially visible pool table with scattered balls, a cue leaning against the wall, and a cluttered bulletin board with flyers.

Shot on a Sony A7 IV with a Sony FE 35mm f/1.4 GM lens at f/1.8. ISO 3200, shutter speed 1/100s. White balance pushed warm to approximately 4500K, giving the scene an overall amber cast. Underexposed by approximately one stop. The wider 35mm focal length includes more of the environment while still keeping her dominant in the frame. Natural vignetting is moderate. Film-like grain is visible throughout but less aggressive than higher ISOs. Slight softness in the extreme corners from the wide aperture. The bokeh rendering of the pool table lamp shows a large warm disc with a bright edge ring. Minor chromatic aberration appears along the booth edge.

Eyes placed on the upper-right rule of thirds intersection. Camera at seated eye level, positioned across the booth. The framing feels like a friend sitting across from her snapped a quick photo mid-evening.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 4
# ============================================================================
PROMPT_4=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her early 30s standing at the bar inside Carousel Lounge on East Riverside in Austin, Texas. Her body is angled three-quarters to camera right, one elbow resting on the sticky lacquered bar top, a half-finished whiskey sour in a rocks glass near her hand. She wears a burgundy crepe wrap mini dress tied at the waist with a visible knot, the flutter hem uneven and catching a slight draft. The deep V created by the wrap shows a thin gold chain necklace resting against her sternum. The dress ends above her knees. Her legs are bare, showing a faded tan line at the ankle. Gold strappy heeled sandals with a thin ankle strap.

Her honey-blonde hair is pulled into a half-up bun that has clearly been losing its battle with gravity all evening. The bun itself lists to one side, with multiple loose tendrils falling around her face, neck, and behind her ears. Bobby pins are visible and failing at their job.

She fills approximately 76% of the frame. Her expression is mid-laugh, caught between breaths, eyes squinted nearly shut with genuine mirth, mouth open showing her teeth. The laugh has brought color to her cheeks and the bridge of her nose. Smile lines frame her mouth. A thin ring of darker pigmentation circles beneath her eyes where concealer has worn away.

The primary light source is a rotating multicolored carousel light mounted on the ceiling, currently throwing a wash of warm yellow across her face and upper body with the faintest edge of blue at the periphery. Behind her, three mismatched pendant lamps above the bar provide dim orange pools of light. A Shiner Bock neon sign glows red in the mirror behind the bottles, creating a doubled reflection.

Shot on a Fujifilm X-T5 with a Fujinon XF 56mm f/1.2 R WR lens at f/1.4. ISO 5000, shutter speed 1/60s. White balance set warm at approximately 3600K. The image is underexposed by one full stop. The APS-C sensor produces slightly more pronounced grain than a full-frame equivalent. Noticeable color noise in the deep shadows beneath the bar. Chromatic aberration appears as purple fringing along the bright neon reflections in the mirror. The rotating carousel light has created a very slight motion blur along its edges during the exposure. Bokeh discs from the pendant lamps show visible bright outlines.

Eyes placed on the upper-left rule of thirds intersection. Camera positioned slightly above her eye level, angled down by roughly three degrees, as if the photographer is standing while she leans on the bar. Feels like a friend caught her laughing at something ridiculous someone just said.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 5
# ============================================================================
PROMPT_5=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s inside Mean-Eyed Cat bar on West Fifth Street in Austin, Texas. She perches on the edge of a weathered wooden picnic table that has been dragged inside, body angled three-quarters to camera left. She wears a royal blue sequined mini dress with a rounded scoop neckline and sleeveless cut, the individual sequins catching light at different angles creating a scattered constellation of tiny reflections across her torso. The dress fits closely and ends high on her thighs. She wears black opaque thigh-high stockings, their matte finish contrasting with the sparkle of the dress, the tops hidden beneath the hemline. Black patent leather pumps.

Her long dark hair falls in loose, gentle waves. The left side is tucked neatly behind her ear, exposing a row of small silver stud earrings climbing her earlobe. The right side falls forward freely, brushing her collarbone.

She fills approximately 74% of the frame. Her expression is contemplative and still, lips closed in a neutral resting position, eyes looking directly into the lens with a calm, appraising steadiness. There is no smile, but no tension either. Her skin shows visible pores across her nose and a slight roughness along her jaw. The sequin reflections throw tiny dancing spots of blue light onto the underside of her chin.

The primary light source is a single caged work light clamped to a rafter above and behind her to camera right, casting harsh directional warm light that creates deep shadows on the left side of her face. A green exit sign above a distant doorway provides a faint cool accent in the far background. A string of white Christmas lights draped along the top of the back bar creates soft circular bokeh discs. The background shows rough-hewn wood walls, a Johnny Cash poster, and shelves of mismatched liquor bottles.

Shot on a Canon EOS R6 Mark II with a Sigma 50mm f/1.4 DG DN Art lens at f/1.6. ISO 4000, shutter speed 1/80s. White balance set warm at approximately 3900K, pushing the work light's already warm output into deep amber. Underexposed by one stop, with the left side of her face falling into near-complete shadow. Strong grain structure with visible luminance noise. The Sigma lens produces distinctive bokeh with a slightly busier character than native Canon glass. Chromatic aberration visible as cyan fringing along the bright sequin highlights. Natural vignetting from the wide aperture darkens all four corners substantially.

Eyes placed on the upper-right rule of thirds intersection. Camera at eye level with her seated on the table edge. Feels like a quick shot a friend took while she was lost in thought between songs on the jukebox.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 6
# ============================================================================
PROMPT_6=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s just inside the propped-open front door of Ginny's Little Longhorn Saloon on Burnet Road in Austin, Texas. She stands with her back partially against the door frame, body angled three-quarters to camera right, one hand pushed back into her hair holding it off her face. She wears a white cotton eyelet mini dress with puff sleeves and a square neckline, the tiny embroidered holes in the fabric creating a subtle textured pattern. The white cotton has gone slightly translucent where the warm light behind her hits it. The dress is A-line cut, ending above her knees. She wears tan rough-out suede knee-high boots with decorative side fringe that moves slightly, the suede worn darker at the shins and toes.

Her light brown hair is windblown and tangled from stepping in and out of the bar, pushed back from her face by her raised left hand. Pieces fly in different directions, some sticking to her neck from the heat, others catching the light from outside.

She fills approximately 70% of the frame. Her expression is playful and slightly defiant, one eyebrow raised, a crooked half-smile pulling to the right. Her cheeks are flushed pink from the heat or from drinking. Mascara has smudged very slightly beneath her right eye.

The primary light source is the warm glow of street light filtering through the open doorway behind her and to camera left, creating a strong backlight that edges her hair and right shoulder with a golden rim. The interior of the bar is lit by a string of chili pepper lights strung across the ceiling and a Budweiser pool table lamp casting its glow in the middle distance. A taxidermied deer head on the wall behind her catches a stray glint. The background shows worn plywood floors and mismatched wooden chairs.

Shot on a Leica SL2-S with a Leica Summilux-SL 50mm f/1.4 ASPH lens at f/1.4. ISO 6400, shutter speed 1/60s. White balance pushed warm to approximately 4000K, exaggerating the golden hour quality of the light from outside. Underexposed by one stop, losing detail in the dark interior but preserving the bright backlight edge. The Leica renders grain with a fine, almost film-like character even at high ISO. The wide open aperture creates extremely shallow depth of field with the backlit doorframe already dissolving into a soft bright wash. Mild flare from the backlight creates a warm haze across the lower portion of the frame. Slight chromatic aberration at the bright rim-light edges.

Eyes placed on the upper-left rule of thirds intersection. Camera at eye level, positioned inside the bar looking toward the door. The shot feels like a friend caught her in that perfect moment of stepping back inside.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 7
# ============================================================================
PROMPT_7=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her early 30s sitting in a low leather chair near the jukebox inside Deep Eddy Cabaret on Lake Austin Boulevard in Austin, Texas. Her body is angled three-quarters to camera left, legs crossed, one hand resting on the arm of the chair. She wears an orange ribbed knit mini dress with a fitted turtleneck, the ribbed texture creating vertical lines that catch light along each ridge. The knit clings to her frame without being skintight, showing the natural shape of her body with honest contours. The dress ends mid-thigh. Bare legs show a small bruise on one shin and the faint shadow of leg hair. Black leather ankle boots with tarnished silver buckle details.

Her hair is a straight blunt bob cut precisely at chin length, very dark brown, almost black, with a sharp part on the left. The geometric cut frames her face cleanly.

She fills approximately 77% of the frame. Her expression is sultry and intense, lids slightly heavy, lips pressed together with the faintest hint of a knowing smile at the corners. She looks directly into the camera with an unblinking steadiness. Her olive skin shows visible texture under the warm light, with a slight oiliness across the T-zone.

The primary light source is the illuminated front panel of the jukebox immediately behind her and to camera left. Its multicolored glow washes across the left side of her face in bands of warm amber and soft blue as it cycles through its display. A single pendant lamp with a amber glass shade hangs above and to camera right, casting a dim cone of warm light that catches the top of her head and right shoulder. The background shows the jukebox's chrome trim and bubble tubes, a dark wood-paneled wall, and a collection of framed black-and-white photographs hanging in a haphazard cluster.

Shot on a Nikon Z8 with a Nikkor Z 50mm f/1.2 S lens at f/1.4. ISO 3600, shutter speed 1/100s. White balance set warm at approximately 4100K. Underexposed by approximately one stop. The high-resolution sensor captures fine grain with a tight, controlled pattern. The 50mm f/1.2 produces exceptionally creamy bokeh, rendering the jukebox details into soft swirls of color and light. Chromatic aberration appears as slight blue fringing along the chrome edges of the jukebox. Natural vignetting is moderate but noticeable, framing her in a soft darker border. A faint reflection of the jukebox light appears in her eyes as two small colored points.

Eyes placed on the upper-right rule of thirds intersection. Camera positioned slightly below seated eye level, angled up by roughly two degrees. The image looks like a friend sat down across from her and fired off a quick portrait without asking.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 8
# ============================================================================
PROMPT_8=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s standing near the back wall of The White Horse on East Sixth Street in Austin, Texas, during a crowded Saturday night. Her body is angled three-quarters to camera right, one shoulder pressed against a rough brick column. She wears a gold metallic lamé mini dress with a halter neckline tied behind her neck, the back open to the small of her back visible where her body turns from the wall. The metallic fabric catches every available light source, creating bright hot spots and deep creases of shadow across the material. The dress hits high on her thighs. She wears nude fishnet thigh-high stockings, the diamond mesh pattern visible on close inspection, the elastic tops creating a faint line beneath the dress hem. Gold metallic strappy sandals match the dress.

Her jet-black hair is very long and straight, center-parted, falling like curtains on either side of her face, reaching well past her shoulders and almost to her elbows. The hair is so straight it barely moves.

She fills approximately 73% of the frame. Her expression is flirty and knowing, a deliberate smile with lips closed, chin tilted slightly down so her eyes look up through her lashes at the camera. One eyebrow is arched higher than the other. Her skin glows warm with perspiration from the crowded room, tiny beads visible along her hairline and upper lip.

The primary light source is the stage lighting from the live country band visible in the deep background, throwing intermittent warm washes of amber and white across the crowd. A red exit sign above a door to her left casts a faint crimson accent across the brick wall. Christmas lights stapled along the ceiling provide scattered warm fill. The background is busy with blurred figures in motion, cowboy hats and raised glasses creating a chaotic tapestry of movement and warm tones. The brick column beside her catches light on its rough surface.

Shot on a Sony A7R V with a Sony FE 50mm f/1.2 GM lens at f/1.4. ISO 6400, shutter speed 1/125s. White balance pushed warm to approximately 3500K, turning the already warm bar lighting into rich amber and copper. Underexposed by one stop, collapsing the busy background into a darker mass of shapes and movement. Significant grain from the high ISO, with noticeable color noise in the red-lit areas of the brick. The busy background with multiple point light sources creates a field of bokeh discs in various sizes and colors, some with visible cat-eye distortion from the wide aperture at the frame edges. Chromatic aberration appears along the bright metallic highlights of her dress.

Eyes placed on the upper-left rule of thirds intersection. Camera at standing eye level. The shot feels like a friend spotted her leaning against the wall and grabbed a photo before she moved.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 9
# ============================================================================
PROMPT_9=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her early 30s inside Broken Spoke dance hall on South Lamar in Austin, Texas. She sits on the edge of the worn wooden dance floor, legs extended, leaning back on one hand, body angled three-quarters to camera left. She wears a navy blue off-shoulder mini dress with a structured fitted bodice and a slightly flared skirt that fans out around her on the floor. The elastic off-shoulder neckline sits just below her collarbones, showing tan lines from a different top. The dress ends above her knees. She wears dark brown leather knee-high riding boots with a flat heel, the leather well-worn and creased at the ankles, small scratches visible on the shins.

Her dark hair is pulled into a high ponytail, sleek and tight at the crown, with deliberately pulled-out face-framing pieces on either side, curled loosely. The ponytail itself is thick and falls past her shoulder blades.

She fills approximately 72% of the frame. Her expression is a warm, easy smile with teeth showing, eyes bright and slightly unfocused as if she has had exactly two beers. Dimples appear on both cheeks. Her skin shows light freckling across her shoulders and upper chest. A thin tan line marks where a watch usually sits on her left wrist.

The primary light source is a single overhead fluorescent tube behind a yellowed plastic cover, casting a flat, unflattering light from directly above that creates shadows under her eyes and chin. A Tecate neon sign on the far wall adds a warm orange accent to the right side of the background. The dance floor reflects a dim sheen of worn polyurethane. The background shows the edge of the small wooden stage, a drum kit partially visible, and walls covered in decades of bumper stickers and signed dollar bills.

Shot on a Canon EOS R3 with a Canon RF 35mm f/1.4 L VCM lens at f/1.8. ISO 3200, shutter speed 1/80s. White balance set warm at approximately 4400K, making the fluorescent overhead light appear warmer than reality but still retaining a slight green cast in the shadows. Underexposed by approximately one stop. The wider 35mm includes more of the dance floor and environment. Moderate grain structure. The low shooting angle with the wider lens introduces mild perspective distortion, making her boots in the foreground appear slightly larger. Natural vignetting darkens the upper corners. Chromatic aberration appears at the bright fluorescent tube edge. Slight motion blur on the face-framing pieces from a head movement during the exposure.

Eyes placed on the upper-right rule of thirds intersection. Camera positioned at floor level, shooting slightly upward. Looks like a friend sat down on the dance floor next to her during a break between songs and took a quick shot.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 10
# ============================================================================
PROMPT_10=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s at the bar top inside Donn's Depot on West Fifth Street in Austin, Texas. She sits on a round rotating bar stool, body angled three-quarters to camera right, both elbows resting on the bar behind her as she leans back. She wears a silver holographic mini dress with thin spaghetti straps and a draped cowl neckline, the holographic material shifting between silver, pale blue, and faint pink depending on the angle of light. The fabric is thin and slightly clingy, showing wrinkle lines across the stomach from her leaned-back posture. The dress ends high on her thighs. Bare legs, uncrossed, with clear perspex block heels that nearly disappear against the linoleum floor.

Her auburn hair is a wild mass of big voluminous curls, slightly frizzy with a halo of flyaway strands catching the backlight. The curls are natural and untamed, springing in different directions, taking up significant visual space around her head and shoulders.

She fills approximately 75% of the frame. Her expression is a slow, sleepy, satisfied smile, lids heavy, head tilted slightly to camera right. She looks directly at the lens with relaxed, half-lidded eyes. Her cheeks are warmly flushed. Her lipstick, a coral shade, has slightly feathered beyond her lip line. A small cluster of beauty marks dots her left cheekbone.

The primary light source is a rotating mirror ball mounted above the tiny dance floor behind and to camera left, throwing scattered squares of white light that slowly drift across the walls, bar top, and occasionally across her face and dress, making the holographic material flash. The bar's backlit liquor shelf provides a warm amber glow behind the bartender area. A string of multicolored party lights above the bar adds small scattered color accents.

Shot on a Fujifilm GFX 50S II with a Fujinon GF 80mm f/1.7 R WR lens at f/1.7. ISO 5000, shutter speed 1/60s. White balance set warm at approximately 3700K. Underexposed by one stop. The medium format sensor produces a distinctive rendering with very smooth tonal transitions and a unique shallow depth of field character. Grain is present but finer than APS-C at equivalent ISO. The rotating mirror ball creates small bright squares of light that render as slightly elongated bokeh shapes due to the medium format optics. Chromatic aberration appears as subtle color fringing on the holographic dress highlights. The large sensor produces a more three-dimensional separation between subject and background.

Eyes placed on the upper-left rule of thirds intersection. Camera positioned at her seated eye level, slightly to camera right. The image feels like a friend at the bar turned around and snapped a candid shot during a quiet moment between sets.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 11
# ============================================================================
PROMPT_11=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her early 30s inside Sahara Lounge on East Twelfth Street in Austin, Texas. She stands near a corner where two walls meet, body angled three-quarters to camera left, one hand wrapped around a sweating bottle of Dos Equis. She wears a teal satin slip dress with delicate ecru lace trim along the V-neckline and the slightly uneven hem. The bias cut drapes across her body in fluid diagonal lines, the satin catching light in long streaks and pooling in shadow where the fabric gathers. The dress ends above her knees. She wears black thigh-high stockings with lace tops, the intricate lace band visible just below the hemline, the sheer black material smoothing out details of her legs. Black pointed-toe kitten heels.

Her chestnut-brown hair is in a loose side braid draped over her right shoulder, but the braid has started to come undone, with sections pulling free and wisps framing her face. Small pieces have escaped entirely near her temples.

She fills approximately 74% of the frame. Her expression is serious and direct, a slight furrow between her brows, lips pursed just slightly as if she is about to say something but has not started yet. No smile, but the look is warm rather than cold. Her skin shows fine visible texture, with a light sheen of oil across her nose. Dark circles under her eyes are not concealed. A thin silver chain bracelet hangs loosely on the wrist holding the beer.

The primary light source is a strand of bare Edison bulbs running along the ceiling junction of the two walls, casting pools of warm golden light with harsh shadows between them. A green-tinted fluorescent tube behind the bar in the far background casts a cooler accent. Moroccan-style punched tin lanterns hang from hooks on one wall, projecting intricate shadow patterns onto the painted concrete floor. The background shows a stripped-down stage area with tangled cables, a microphone stand, and a hand-painted mural of a desert scene.

Shot on a Sony A7C II with a Voigtlander Nokton 50mm f/1.2 Aspherical SE lens at f/1.4. ISO 4000, shutter speed 1/80s. White balance set warm at approximately 3900K. Underexposed by one stop. The Voigtlander lens produces distinctive swirly bokeh in the out-of-focus areas, giving the background a slightly dreamy, rotating quality. Grain is moderate with some color noise in the green-tinted shadows. Chromatic aberration is more pronounced than modern autofocus lenses, showing noticeable purple and green fringing along high-contrast edges. Natural vignetting is strong at f/1.4, heavily darkening the corners. The manual focus lens shows razor sharpness at the focal plane with a rapid falloff.

Eyes placed on the upper-right rule of thirds intersection. Camera at standing eye level. The shot feels like a friend across the room raised the camera and took one quiet frame.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 12
# ============================================================================
PROMPT_12=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s inside Skylark Lounge on East Seventh Street in Austin, Texas. She leans against the curved end of the bar with both hands flat on the bar top behind her, body angled three-quarters to camera right, weight shifted onto one hip. She wears a coral ribbed bodycon mini dress with a sleeveless mock neck, the ribbed knit texture creating fine horizontal lines that curve with her body. The tight fit shows every natural contour, including the slight press of her hipbone and the crease at her waist from leaning. The coral color appears more salmon-pink under the warm bar lighting. The dress ends mid-thigh. Bare legs, slightly ashy at the knees, with nude block-heel sandals showing her toes.

Her straight jet-black hair is cut bluntly at mid-back length and tucked neatly behind both ears, pulling her face open and unframed. Small gold stud earrings are visible.

She fills approximately 76% of the frame. Her expression is a closed-lip smile of amusement, as if someone just told a joke and she is deciding whether it was funny. Her head tilts slightly to camera left. A raised eyebrow suggests skeptical amusement. Her medium-dark skin shows visible texture, with light catching the slight sheen of moisturizer on her forehead. A tiny piercing scar marks where a nose ring used to be.

The primary light source is a row of red-gelled track lights along the ceiling that wash the entire bar in a warm red-amber tone. A blue neon sign spelling the bar name hangs behind the bar, casting a contrasting cool blue light on the bottle shelves and the back of her head. A small candle in a red glass holder on the bar top provides a faint warm point light from below and behind her left elbow.

Shot on a Pentax K-1 Mark III with an HD Pentax-D FA 50mm f/1.4 SDM AW lens at f/1.6. ISO 5000, shutter speed 1/60s. White balance set slightly warm at approximately 4000K, but the red-gelled track lights dominate the color rendering regardless. Underexposed by one stop, collapsing the background into deep maroon shadows. The Pentax's sensor characteristics produce a distinctively warm tonality with slightly heavier grain than Sony or Canon equivalents. The red-dominant lighting creates challenging color rendition, with the coral dress shifting toward warm peach and her skin tones carrying a healthy flush. Chromatic aberration appears along the blue neon sign edges as color fringing. Moderate vignetting. The candle flame renders as a soft, elongated warm disc in the near bokeh.

Eyes placed on the upper-left rule of thirds intersection. Camera at standing eye level, positioned slightly to camera right. Feels like a friend standing nearby took a candid shot while she was smirking at something across the bar.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 13
# ============================================================================
PROMPT_13=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s sitting on a wooden bench inside The Liberty on East Sixth Street in Austin, Texas. Her body is angled three-quarters to camera left, she has just pulled a baseball cap off her head and holds it in one hand at her side. She wears a deep purple crushed velvet mini dress with wide bell sleeves that drape from the elbows, and a deep scoop back partially visible where she twists toward the camera. The velvet catches light in the same irregular way as the emerald version, with light and dark patches showing the nap direction. The dress ends above her knees. She wears charcoal gray suede knee-high boots with a stacked block heel, the suede slightly matted from wear.

Her dirty-blonde hair is in full hat-hair disarray, flat and compressed on top where the cap sat, with the lower layers flipped outward and slightly static, standing away from her neck in places. She clearly does not care.

She fills approximately 73% of the frame. Her expression is a wide, toothy grin, caught in the act of laughing, eyes crinkled and bright. The laugh is real, showing slightly uneven teeth and a visible filling on an upper molar. Her nose is scrunched. Freckles are scattered across both cheeks and the bridge of her nose. Mascara has left a faint smudge on her upper right eyelid from rubbing.

The primary light source is a hanging lamp with a woven rattan shade directly above the bench, casting warm dappled light through the weave pattern onto her face, shoulders, and lap, creating a shadow pattern like irregular geometric lace. The bar's main floor behind her is lit by scattered warm pendant lights and a vintage Pabst Blue Ribbon clock that glows blue-white on the far wall. A window to camera right shows dark blue night sky with the faint glow of a street lamp.

Shot on a Nikon Z5 with a Nikkor Z 50mm f/1.8 S lens at f/2.0. ISO 4000, shutter speed 1/100s. White balance set warm at approximately 4200K. Underexposed by approximately three-quarters of a stop. The f/1.8 lens at f/2.0 provides slightly more depth of field than the wider aperture lenses, keeping more of her face and torso in acceptable focus while still dissolving the background. Grain is moderate. The dappled light from the rattan shade creates interesting highlight-to-shadow transitions with small bright patches surrounded by soft shadows. Chromatic aberration is minimal with this lens but faintly visible on the PBR clock highlights. Mild vignetting at the corners.

Eyes placed on the upper-right rule of thirds intersection. Camera at seated eye level, positioned directly across from her on the bench. The image looks like a friend sitting with her captured the exact moment she cracked up about something.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 14
# ============================================================================
PROMPT_14=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s standing near the pool table inside Barfly's on West Sixth Street in Austin, Texas. She leans one hip against the edge of the pool table, body angled three-quarters to camera right, one hand resting on the green felt behind her. She wears a yellow chiffon mini dress with three tiers of soft ruffles, thin spaghetti straps, and a straight-across neckline. The chiffon is slightly sheer, with the ruffles layering enough for opacity except at the edges where single layers catch the light and glow translucent. The bright yellow appears more muted gold under the bar lighting. The dress ends well above her knees. She wears white opaque thigh-high stockings, the bright white stark against the yellow dress, the stocking tops hidden under the lowest ruffle tier. White leather mules with a low heel.

Her long hair falls in beachy waves with a salt-spray texture, parted slightly off-center to the left. The waves are not perfectly formed, some sections clumping together, others separating into thinner pieces. Her hair color is a warm medium brown with lighter sun-bleached streaks near the face.

She fills approximately 75% of the frame. Her expression is a quiet, secretive smile, as if she knows something you do not, lips together but curved, eyes holding steady on the camera with a hint of mischief. Her skin is sun-touched with a faint peeling sunburn across the tops of her shoulders. Visible pores across her cheeks and a tiny healed scratch on her forearm.

The primary light source is the pool table lamp directly above the table, a rectangular fixture with a green metal shade that casts a strong cone of warm white light straight down onto the felt and bouncing up as green-tinted fill onto her face and the underside of her chin. This green-bounce effect is subtle but gives her skin an unusual undertone. A Dos Equis neon sign mounted on the wall behind the pool table provides an amber accent. The background shows cue sticks in a wall rack, chalk cubes on the table rail, and a few blurred figures at a distant high-top table.

Shot on a Canon EOS R8 with a Canon RF 50mm f/1.8 STM lens at f/2.0. ISO 3600, shutter speed 1/80s. White balance set warm at approximately 4300K. Underexposed by one stop. The consumer-grade RF 50mm f/1.8 produces slightly less refined bokeh than the f/1.2 version, with busier rendering in the out-of-focus areas and more visible onion-ring artifacts in the highlight discs. Moderate grain with some color noise visible in the green-tinted shadow areas. Chromatic aberration appears at the edges of the bright pool table lamp shade. The shallow but not paper-thin depth of field at f/2.0 keeps her entire face sharp while the pool table felt in the foreground falls soft.

Eyes placed on the upper-left rule of thirds intersection. Camera positioned at standing eye level. Feels like a friend waiting for their turn at pool raised the camera for a quick snap.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 15
# ============================================================================
PROMPT_15=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her early 30s inside Elbow bar on East Cesar Chavez in Austin, Texas, during a late Saturday night. She stands at a high cocktail table, body angled three-quarters to camera left, one hand wrapped around a rocks glass with an amber drink. She wears a black architectural cutout mini dress with a high mock neckline and angular geometric cutouts at both sides of her waist and along her lower ribs, showing angular patches of skin through the openings. The fabric is a matte stretch material that absorbs light rather than reflecting it, creating a void-like quality against the colorful bar background. The dress ends mid-thigh. Bare legs with visibly defined calf muscles. Red patent leather pointed-toe pumps that reflect every light source in small bright streaks along the glossy surface.

Her dark hair is slicked back tightly with styling gel in a deliberate wet-look style, combed flat against her skull with no part, exposing both ears and the full geometry of her hairline. A single pair of thick gold hoop earrings hangs prominently.

She fills approximately 78% of the frame. Her expression is intense and unwavering, a flat, direct stare with no smile, jaw set, lips slightly pursed. It is the look of someone who has been watching you from across the bar and is daring you to come say something. Her angular jaw catches the light sharply. A thin scar runs along her left jawline. Her makeup is minimal but deliberate, with strong brows and nothing else overstated.

The primary light source is a strip of warm amber LED tape running along the underside of the bar shelf behind her, casting a horizontal glow at roughly her shoulder height. A single track-mounted halogen spot above the cocktail table throws hard downward light, creating defined shadows beneath her nose, chin, and the cutout openings of the dress. The background is dark with warm amber tones punctuated by the glow of bottles on backlit shelving and the faint blue light of a phone screen in someone's hand.

Shot on a Sony A1 with a Sony FE 85mm f/1.4 GM lens at f/1.4. ISO 4000, shutter speed 1/125s. White balance set warm at approximately 3800K. Underexposed by one stop. The 85mm focal length compresses the background, stacking the bar elements closer together visually. The f/1.4 on 85mm produces extremely shallow depth of field, with the hand holding the glass already beginning to soften. The Sony A1 sensor resolves grain with very fine structure even at ISO 4000. Chromatic aberration is minimal with the GM lens but faintly visible on the bright amber LED strip as a slight green edge. The red patent pumps in the lower portion of the frame catch specular highlights that render as hard-edged bright spots. Moderate vignetting frames the composition.

Eyes placed on the upper-right rule of thirds intersection. Camera positioned at standing eye level, roughly eight feet away due to the 85mm compression. The shot feels like a friend across the bar zoomed in and caught that intense stare.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 16
# ============================================================================
PROMPT_16=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s inside Sam's Town Point on South Manchaca Road in Austin, Texas, early in the evening with some daylight still filtering through the windows. She stands near the front window, body angled three-quarters to camera right, backlit by the warm amber light of the setting sun outside. She wears a champagne gold satin mini dress with a draped cowl neckline and thin chain straps that catch and reflect light in tiny links. The satin is a warm champagne color that shifts between gold and pale pink depending on the light angle. Small wrinkles radiate from the waist where she has been sitting. The dress ends above her knees. She wears sheer nude-toned knee-high boots with a clear acrylic heel, the transparent material of the boots catching and refracting light in unexpected ways, the seams visible running up the back.

Her dark blonde hair has clearly just been released from an updo, with the imprint of pins and clips still visible in the crimped sections. Big loose curls tumble chaotically around her face, some still holding their shape, others already unwinding into softer waves. A few bobby pins remain tangled in the hair near her left temple.

She fills approximately 71% of the frame. Her expression is free and easy, a broad relaxed smile with her head tilted back slightly, caught mid-exhale, eyes warm and slightly glazed with the pleasant buzz of an early evening drink. Laugh lines are deeply carved around her mouth. Her skin catches the warm backlight, showing fine peach fuzz along her jawline and the silhouette of her profile.

The primary light source is the natural golden-hour sunlight filtering through the front window blinds behind her, creating horizontal bands of warm light and shadow across her body and the bar interior. The sun creates a strong rim light along her left side and through her hair. A warm incandescent fixture above the bar provides a secondary fill from camera left. A Yuengling neon sign on the far wall adds a warm accent. The background through the window shows the silhouette of a parking lot and distant trees against a warm evening sky.

Shot on a Leica Q3 with its fixed Summilux 28mm f/1.7 ASPH lens at f/1.7. ISO 3200, shutter speed 1/125s. White balance pushed warm to approximately 4600K, intensifying the golden hour quality. Underexposed by one stop. The 28mm wide angle includes more of the bar environment and creates slight perspective distortion, with the window appearing larger in the background. The Leica Q3's sensor produces fine, film-like grain at ISO 3200. The wide angle with wide aperture creates an unusual depth-of-field effect where the plane of focus is very thin but the wider angle keeps more contextual sharpness in the periphery. Strong lens flare from the direct backlight creates warm hexagonal artifacts and a broad haze across the lower right. Chromatic aberration appears along the window blind edges.

Eyes placed on the upper-left rule of thirds intersection. Camera at standing eye level, positioned well inside the bar looking toward the window. The image looks like a friend captured her in that perfect golden hour moment just after she arrived.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 17
# ============================================================================
PROMPT_17=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s inside Scoot Inn on East Fourth Street in Austin, Texas, during a busy weeknight show. She sits on a metal folding chair near the back of the indoor venue area, body angled three-quarters to camera left, legs crossed at the knee. She wears a matching dark green leather mini skirt and crop top set, the top featuring a front zip pulled to mid-chest, the leather stiff and slightly creased at the waist where the two pieces meet, showing a narrow band of skin at the midriff. The leather has a matte finish with a slight waxy sheen. The skirt ends high on her thighs. She wears black ribbed thigh-high stockings, the ribbed texture catching linear highlights along each ridge, the tops visible above the skirt hem by roughly an inch. Black chunky platform boots.

Her hair is jet black, pin-straight and silky with blunt-cut bangs sitting just above her eyebrows, the rest falling past her shoulders in a smooth sheet. The bangs cast a slight shadow across her forehead.

She fills approximately 77% of the frame. Her expression is a slow, knowing smile, one corner of her mouth pulled up higher, eyes half-lidded and smoky. She looks directly at the camera through her bangs with a languid, unhurried confidence. Her East Asian features catch the light cleanly along her cheekbones and the bridge of her nose. Her skin shows a light sheen of perspiration at her temples and upper lip from the warm crowded room.

The primary light source is the stage lighting bleeding from camera left, currently throwing a wash of warm white light that catches the left side of her face and the metallic zip of her top. A string of warm globe lights hung across the ceiling provides scattered overhead fill. The red glow from an exit sign above a side door touches the right edge of the frame. The background is a blur of standing figures, beer cans raised, with the faint outlines of band gear and amplifiers visible through gaps in the crowd.

Shot on a Ricoh GR IIIx with its fixed GR 40mm f/2.8 lens at f/2.8. ISO 6400, shutter speed 1/60s. White balance set warm at approximately 3800K. Underexposed by one stop. The compact APS-C camera produces grainier images at ISO 6400 than full-frame equivalents, with visible luminance and color noise throughout. The f/2.8 maximum aperture provides less background separation than faster lenses, keeping more background detail recognizable even if soft. The small sensor and modest aperture create a distinctive look that feels more like documentary photography than studio portraiture. Slight softness in the corners from the compact lens design. Minor barrel distortion from the 40mm equivalent focal length.

Eyes placed on the upper-right rule of thirds intersection. Camera held at seated eye level, almost casually at hip height. The image looks exactly like someone sitting next to her raised their compact camera and took one frame without fussing.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 18
# ============================================================================
PROMPT_18=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her early 30s inside The Continental Club on South Congress in Austin, Texas, during a packed rockabilly show. She leans against the long wooden bar, body angled three-quarters to camera right, one booted foot hooked on the brass bar rail. She wears a white cotton lace mini dress with an opaque lining, three-quarter sleeves with scalloped cuffs, and a scalloped hemline. The intricate lace pattern shows floral motifs. The white fabric has picked up a faint amber cast from the warm bar lighting, appearing more cream than white. The dress ends at her lower thighs. Tan leather cowboy boots with burgundy embroidered floral stitching, worn enough that the leather has softened and creased naturally.

Her auburn hair is long and wavy, swept entirely to the left side, flowing over her left shoulder in a thick cascade while the right side of her neck is fully exposed. The waves are loose and natural, catching warm highlights.

She fills approximately 73% of the frame. Her expression is caught mid-sentence, mouth open in the shape of a word, eyes focused on something or someone just to camera right and slightly past the lens. She is animated and engaged, mid-conversation, one hand gesturing slightly. Not posing. Her skin is fair with pink undertones, flush visible across her cheeks and upper chest. A cluster of small moles marks her right collarbone area.

The primary light source is the warm glow from vintage sconce lights along the wall behind the bar, creating pools of amber at regular intervals. The stage lights in the far background throw intermittent flashes of warmer light across the crowd. A blue Bud Light neon sign above the cash register provides a contrasting cool accent that touches the right side of her face with a faint blue wash. The background shows the crowded bar from the side, bottles lining shelves, the bartender in motion blur behind her, and the shoulders and heads of other patrons.

Shot on a Nikon Z6 III with a Nikkor Z 50mm f/1.2 S lens at f/1.4. ISO 5000, shutter speed 1/60s. White balance set warm at approximately 3700K. Underexposed by one stop. The motion of her talking and gesturing during the relatively slow 1/60s shutter creates the faintest microblur on her gesturing hand while her face stays sharp, caught in a moment of relative stillness between movements. Strong grain with the Nikon's distinctive color science rendering warm tones richly. Chromatic aberration appears as purple fringing along the bright sconce highlights. The busy background crowd renders as a warm, painterly smear of shapes and faces. Heavy vignetting from the f/1.4 aperture.

Eyes placed on the upper-left rule of thirds intersection. Camera at standing eye level at the bar. Looks like a friend standing next to her at the bar turned and caught her mid-conversation.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 19
# ============================================================================
PROMPT_19=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s inside Stay Gold bar on East Cesar Chavez in Austin, Texas, late at night near closing time. The bar is nearly empty. She stands near the jukebox, body angled three-quarters to camera left, one arm extended with her finger on the jukebox selection buttons. She wears a bright red bandage-style mini dress with strapless construction, the wide horizontal bands of stretchy fabric wrapping around her torso in overlapping layers. The tight construction leaves visible seam lines at each band junction. The red appears richly saturated under the warm low lighting. The dress ends high on her thighs. She wears black suede over-the-knee boots with a thin stiletto heel, the soft suede fitting close to her legs and slightly wrinkled at the knee bend where the material bunches.

Her dark brown hair is swept up into a high messy bun that is deliberately sculptural rather than accidental, with two longer tendrils pulled free to frame her face on either side, curling loosely near her jawline.

She fills approximately 72% of the frame. Her expression is soft and slightly melancholic, a closing-time look, a faint wistful smile with tired eyes that still manage to find the camera with warmth. The night is winding down and it shows in the slight droop of her lids and the relaxed set of her mouth. Her skin shows the wear of a long night, foundation faded, natural texture showing through, slight darkness under the eyes more pronounced than it was hours ago.

The primary light source is the jukebox itself, its illuminated front panel casting a warm multicolored glow across the right side of her face and extended arm. A single overhead fixture in the center of the now-empty bar provides dim amber ambient light. Most of the neon signs have been turned off, leaving only a single Shiner sign still glowing amber-red on the far wall. Chairs are upturned on tables in the background. The floor shows scattered debris from the evening.

Shot on a Canon EOS R5 Mark II with a Canon RF 85mm f/1.2L USM DS lens at f/1.4. ISO 5000, shutter speed 1/60s. White balance set warm at approximately 3600K. Underexposed by one full stop. The DS (Defocus Smoothing) version of the 85mm f/1.2 produces an unusually smooth, almost dreamy bokeh with no hard edges to highlight discs, giving the out-of-focus jukebox a painted quality. Grain is visible throughout with warm color noise in the shadows. The nearly empty bar provides less visual clutter in the background, with the upturned chair legs creating geometric bokeh shapes. Chromatic aberration appears faintly along the bright jukebox panel edge. Moderate vignetting creates a tunnel-vision effect that draws the eye inward.

Eyes placed on the upper-right rule of thirds intersection. Camera at standing eye level, eight feet back. The image feels like the last photo a friend took before everyone headed home for the night.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 20
# ============================================================================
PROMPT_20=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s inside Workhorse Bar on East Sixth Street in Austin, Texas, during a busy Friday night. She sits in a dark corner booth, body angled three-quarters to camera right, one arm stretched along the top of the booth behind her. She wears a dusty rose pink wrap mini dress with sheer flutter sleeves and a self-tie waist bow that has come partially undone, one end hanging longer than the other. The fabric is a soft georgette that moves with air currents. The muted pink appears dustier and more neutral under the warm ambient light. The dress ends above her knees. Bare legs tucked under the table, one foot visible in a leopard-print pointed-toe flat, the print slightly worn at the toe.

Her hair is her statement. Natural tightly curly texture completely loose, big, and free, forming a substantial halo around her head and shoulders, catching light along the outer edge in a warm golden corona. The volume is impressive and unapologetic, with individual coils visible at the perimeter.

She fills approximately 74% of the frame. Her expression is a warm, open laugh caught at the peak, eyes squeezed in genuine joy, teeth showing, head thrown back slightly. The laugh has animated her entire face, with dimples cutting deep and nostrils slightly flared. Her rich dark brown skin catches the warm light beautifully, with highlights along her cheekbones and the bridge of her nose showing natural radiance. A thin chain with a small pendant rests in the hollow of her throat.

The primary light source is a small battery-powered tea light candle on the booth table, casting a faint warm glow from below that fills in the shadows under her chin and highlights the underside of her curls with a warm rim. A distant stage light bleeds warm amber light across the bar, providing general ambient fill. A purple neon cocktail glass sign on the wall behind the booth casts a faint cool accent along the upper edge of the frame. The booth itself is deep brown vinyl with cracked patches showing yellowish foam beneath.

Shot on a Sony A7 III with a Tamron 35mm f/1.4 Di USD lens at f/1.6. ISO 5000, shutter speed 1/80s. White balance set warm at approximately 3900K. Underexposed by one stop. The older Sony A7 III sensor produces slightly noisier files at ISO 5000 than newer bodies, with more visible color noise, especially in the shadow areas of the booth. The Tamron 35mm produces clean but slightly clinical bokeh compared to native Sony glass. The wider 35mm includes more of the booth environment, giving context. Chromatic aberration appears at the purple neon sign edge. The tea light candle in the near foreground is out of the focal plane and renders as a soft warm orb. Moderate vignetting.

Eyes placed on the upper-left rule of thirds intersection. Camera at seated eye level, positioned across the booth table. Looks like a friend sitting across from her caught the peak of a great laugh.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 21
# ============================================================================
PROMPT_21=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her early 30s inside Longbranch Inn on East Eleventh Street in Austin, Texas. She stands at the end of the bar near the service well, body angled three-quarters to camera left, one hand resting on the bar edge, the other holding a longneck Shiner bottle by the neck loosely at her side. She wears an olive green twill cargo-style mini dress with a front zip pulled to mid-chest, a small pointed collar, and functional flap pockets at the hips with visible brass snap closures. The military-inspired dress has a structured feel, creased where it cinches at the waist. The olive green absorbs much of the warm light, appearing darker than in daylight. The dress ends mid-thigh. She wears black sheer thigh-high stockings with a visible backseam line running up the back of each leg, the seam catching a fine line of reflected light. Black leather pointed-toe mules with a kitten heel.

Her dark hair is pulled back into a low ponytail at the nape of her neck, sleek and tight against her head, with a few intentionally loose pieces framing her face on both sides, softening the severity.

She fills approximately 76% of the frame. Her expression is a quiet, self-assured gaze, lips in a relaxed neutral position with the hint of a Mona Lisa smile, eyes locked directly on the camera with a calm intensity that does not waver. Her gaze is steady and unbothered. Her light olive skin shows natural texture with a slight sheen across the bridge of her nose. Fine baby hairs are visible at her hairline, catching the light.

The primary light source is a row of small spotlights recessed into the ceiling above the bar, creating pools of harsh downward light that illuminate the bar top in bright patches with dark gaps between. She stands in the transitional zone between two pools, with light catching the right side of her face and shoulder more strongly than the left. A warm string of globe lights runs along the back wall of the bar, providing soft ambient fill. An illuminated beer menu board behind the bar casts a flat cool white light that bounces off the bottles. The background shows worn wooden bar stools, a dartboard on the far wall, and a stack of board games on a shelf.

Shot on a Hasselblad X2D 100C with a Hasselblad XCD 80mm f/1.9 lens at f/1.9. ISO 3200, shutter speed 1/100s. White balance set warm at approximately 4000K. Underexposed by one stop. The medium format sensor produces an unmistakable look, with extraordinary tonal depth and a dimensional quality that separates her from the background in a way smaller sensors cannot replicate. Grain at ISO 3200 on the large sensor is extremely fine and film-like, almost pleasant. The 80mm on medium format provides compression similar to 65mm on full frame, with a generous but not extreme depth-of-field falloff. The bokeh from the XCD lens is smooth with rounded highlights. Chromatic aberration is virtually absent. Subtle vignetting at the frame edges.

Eyes placed on the upper-right rule of thirds intersection. Camera at standing eye level. The image has the feel of a friend with an unexpectedly serious camera taking one carefully framed but casual shot.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 22
# ============================================================================
PROMPT_22=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s inside Violet Crown Social Club on East Sixth Street in Austin, Texas, during a noisy weekend crowd. She leans against a wooden post near the patio doorway, body angled three-quarters to camera right, arms crossed loosely at her chest. She wears a bright orange fine mesh mini dress over a nude body-skimming lining, the mesh texture creating a subtle grid pattern visible on close inspection, the orange color vibrant even under the warm bar tones. The crew neck sits at her collarbone. The two layers create a slight visual depth, with the mesh casting a faint shadow pattern on the nude lining beneath. The dress ends above her knees. Bare legs showing a small adhesive bandage on one knee. White leather platform sneakers with slightly dirty soles, the casual footwear contrasting with the dress.

Her light brown hair is divided into two low pigtails, slightly uneven in thickness, tied with plain black elastic bands. It is casual and unfussy, one pigtail resting in front of her shoulder, the other behind.

She fills approximately 73% of the frame. Her expression is playfully challenging, one eyebrow cocked, a crooked half-smile suggesting she just said something provocative and is waiting for a reaction. Her head is tilted to camera left. Her sun-kissed skin shows a constellation of small freckles across the bridge of her nose and cheeks. A friendship bracelet made of colored thread wraps around one wrist.

The primary light source is warm outdoor patio string lights visible through the open doorway behind her and to camera left, casting a golden backlight that edges her left shoulder and the flyaways of her pigtail. A single overhead incandescent bulb near the wooden post provides dim direct fill on her face. A vintage Coca-Cola clock on the far interior wall gives off a faint red-white glow. The background is a split between the warm interior crowd on one side and the darker patio entrance on the other, with the post dividing them.

Shot on an Olympus OM-1 Mark II with a Panasonic Leica DG Nocticron 42.5mm f/1.2 OIS lens at f/1.2. ISO 6400, shutter speed 1/80s. White balance set warm at approximately 4100K. Underexposed by one stop. The Micro Four Thirds sensor at ISO 6400 produces noticeably more grain than full-frame equivalents, with visible luminance and color noise throughout, giving the image a gritty documentary quality. The f/1.2 aperture on MFT provides roughly equivalent depth of field to f/2.4 on full frame, so more of the background remains recognizable than with full-frame f/1.4. The Nocticron renders bokeh with smooth, rounded discs. Chromatic aberration appears as warm fringing along the bright string lights in the background. The smaller sensor format produces a different perspective rendering that appears slightly more compressed.

Eyes placed on the upper-left rule of thirds intersection. Camera at standing eye level. The image looks exactly like a friend leaned back against the opposite wall and took a quick candid shot.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 23
# ============================================================================
PROMPT_23=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her early 30s inside Barton Springs Saloon on South Lamar in Austin, Texas. She stands at the far end of the long bar, body angled three-quarters to camera left, one hand on the brass bar rail, the other holding a cocktail with a lime garnish. She wears a deep plum satin mini dress with gathered detail at the bust creating soft draping, thin straps, and an asymmetric hem that dips lower on the left side than the right. The satin catches the warm light in broad glossy sweeps across the gathered bodice. The plum color appears almost black in the shadows but reveals its purple-red depth where light hits directly. The short side of the hem ends mid-thigh. She wears dark burgundy leather knee-high boots with a low stacked heel, the leather polished but showing fine scratches from regular wear.

Her very dark brown, nearly black hair is blown out straight with significant volume at the roots, dramatically side-parted on the right, with the bulk sweeping over to the left in a glamorous wave that catches light across its surface. The volume gives her an Old Hollywood quality.

She fills approximately 75% of the frame. Her expression is sultry and deliberate, a slow smile with lips slightly parted, eyes focused directly on the camera with a heavy-lidded confidence. The look is intentional and inviting without being forced. Her brown skin shows warm undertones amplified by the ambient lighting, with a natural glow along her cheekbones and the bridge of her nose. A thin line of darker skin marks a healed piercing on her lower lip.

The primary light source is a row of amber glass pendant lights hanging low over the bar, each one casting a cone of warm golden light downward. She stands between two of them, lit more by the spill than the direct cone. A strand of white fairy lights wrapped around a structural beam above her provides scattered pinpoint highlights. A warm Fireball whiskey neon sign on the brick wall behind her casts a red-amber glow on the textured brick surface. The background shows the long bar stretching into the distance with seated patrons, a bartender mid-pour, and shelves of bottles catching ambient light.

Shot on a Nikon Zf with a Nikkor Z 50mm f/1.2 S lens at f/1.4. ISO 4500, shutter speed 1/80s. White balance pushed warm to approximately 3800K. Underexposed by one stop. The Nikon Zf's color science renders warm tones with rich depth, complementing the amber-dominant lighting. The grain has a distinctive character that leans toward a classic film look. The pendant lights in the background render as large, warm bokeh discs with smooth transitions. Chromatic aberration appears as faint magenta fringing along the bright pendant light edges. Moderate vignetting. The 50mm f/1.2 at f/1.4 produces extremely thin depth of field, with the cocktail glass in her extended hand already showing softness.

Eyes placed on the upper-right rule of thirds intersection. Camera at standing eye level, positioned several feet down the bar. Feels like a friend at the bar looked over and quickly took a shot.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 24
# ============================================================================
PROMPT_24=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s inside Hotel Vegas on East Sixth Street in Austin, Texas, during a raucous garage rock show. She is pressed against the side wall near the sound booth, body angled three-quarters to camera right, one hand pressing a cold can of Lone Star against her flushed neck. She wears a midnight navy blue velvet mini dress with long fitted sleeves and a deep plunging V-neckline that extends to below her sternum. The velvet absorbs most of the light, appearing near-black in shadow and revealing its deep blue character only where stage light catches it directly. The fitted cut follows her body closely with visible strain at the seams from the night's movement. The dress ends high on her thighs. Bare legs, visibly flushed from the heat of the crowded venue. Black stiletto strappy sandals with thin crossed straps at the ankle.

Her dark hair is thoroughly tousled and finger-combed, looking like she has been in the crowd near the stage. It goes in every direction with no coherent plan. One strand is stuck to her dark lipstick at the corner of her mouth and she has not noticed or does not care.

She fills approximately 77% of the frame. Her expression is breathless and exhilarated, mouth slightly open, eyes bright and wide, the look of someone who just pushed their way out of a sweaty crowd for air. A genuine, adrenaline-fueled smile is forming. Her chest shows visible perspiration. Her eye makeup has migrated slightly, with smudged liner giving a raccoon-esque effect that somehow works. Her face is shiny with sweat.

The primary light source is the stage lighting bleeding around and past bodies, throwing intermittent flashes of warm white and amber light that catch the side of her face and the velvet of her dress in between crowd silhouettes. A red fire exit light above a door behind her casts a constant dull crimson glow. The blue screen glow of the sound booth equipment provides a faint cool accent from camera right. The background is a dense mass of moving bodies, raised arms, the neck of a guitar visible above the crowd, with visible haze from a fog machine catching the stage lights.

Shot on a Sony A7 IV with a Sony FE 35mm f/1.4 GM lens at f/1.4. ISO 6400, shutter speed 1/100s. White balance set warm at approximately 3600K. Underexposed by one stop. The 35mm captures the energy of the environment while keeping her dominant. The high ISO produces visible grain with some color noise in the red exit light glow. The intermittent stage lighting during the 1/100s exposure captures one specific moment of light, freezing whatever pattern happened to be falling on her at that instant. The fog haze in the background softens the bokeh further, creating a dreamy, atmospheric quality behind the sharp foreground subject. Chromatic aberration appears along the bright stage light leaks. The fog catches lens flare, adding warm streaks.

Eyes placed on the upper-left rule of thirds intersection. Camera at standing eye level, shot quickly from the wall. Feels like a friend caught her in that perfect moment of post-mosh-pit euphoria.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 25
# ============================================================================
PROMPT_25=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s inside Draught House Pub on Medical Parkway in Austin, Texas. She sits on a tall wooden stool at a high round table, body angled three-quarters to camera left, forearms resting on the table, a half-empty pint of dark stout in front of her. She wears an ivory silk charmeuse mini dress with thin spaghetti straps and a bias cut that drapes loosely, the silk catching light in fluid, mercury-like reflections along every fold. Delicate cream lace trim follows the scooped neckline at the bodice. The ivory silk has taken on a warm golden tone from the ambient lighting. The dress ends above her knees. She wears blush pink sheer thigh-high stockings, barely darker than her skin, the delicate color visible mainly at the lace tops and where the material catches light along her shins. Nude pointed-toe kitten heels.

Her hair is very long, platinum blonde, and pin-straight, parted precisely in the middle and flowing freely over both shoulders and down her back. The pale hair catches and reflects every light source, almost glowing in the warm bar light.

She fills approximately 74% of the frame. Her expression is contemplative and gentle, a soft close-lipped smile with eyes slightly downcast and then looking up at the camera, caught in the transition between looking at her drink and looking up. The motion gives a natural, unguarded quality. Her very fair skin shows a tracework of blue veins at her wrists and temples, along with a smattering of pale freckles across her nose. The skin around her eyes shows faint redness, either from tiredness or the dry bar air.

The primary light source is a brass banker's lamp with a green glass shade on the table next to hers, casting a warm sidewash of amber light from camera right, the green shade tinting the upper edge of the light cone. A cluster of mismatched candles on a shelf behind her provides warm accent light. The bar's overall lighting is dim and warm, with exposed filament bulbs in industrial fixtures providing scattered ambient. The background shows dark wood paneling, a chalkboard beer menu with colorful writing, rows of tap handles, and a few other patrons at distant tables in soft focus.

Shot on a Fujifilm X-H2S with a Fujinon XF 56mm f/1.2 R WR lens at f/1.2. ISO 4000, shutter speed 1/80s. White balance pushed warm to approximately 3700K. Underexposed by one stop. The APS-C sensor and fast prime produce beautiful but distinct-from-full-frame rendering, with the 56mm providing an 85mm equivalent field of view and pleasant compression. The grain is slightly more visible than full frame at equivalent ISO but maintains a pleasing character. The f/1.2 aperture produces extremely shallow depth of field with only her near eye and cheekbone tack sharp. The platinum hair catches so much light that it slightly blooms at the brightest edges, creating a soft halo effect. Chromatic aberration appears at the bright hair edges as faint green fringing. The banker's lamp green shade creates a small area of color aberration where the warm and cool tones collide.

Eyes placed on the upper-right rule of thirds intersection. Camera at seated high-table eye level. The image looks like a friend across the table caught her in that moment of looking up from her thoughts.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 26
# ============================================================================
PROMPT_26=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her early 30s inside The Poodle Dog Lounge on Burnet Road in Austin, Texas. She stands near the entrance with her back partially to a wood-paneled wall, body angled three-quarters to camera right, thumbs hooked casually into the pockets of her dress. She wears a rust-colored suede mini dress in a western shirt-dress style, with pearl snap buttons down the front, a pointed collar, and two functional chest pockets with flap closures. The suede has a napped surface that absorbs warm light, appearing rich and earthy. A thin brown leather belt cinches the waist. The dress ends above her knees. She wears black leather knee-high cowboy boots with a pointed toe and a classic Cuban heel, the leather showing the creased patina of genuine wear, with scuffing at the toes and a slight lean at the heels from walking.

Her auburn hair falls in long, loose natural waves, draped symmetrically over both shoulders, the warm red-brown tones amplified by the amber bar lighting. The waves are soft and unstructured, simply her natural texture.

She fills approximately 76% of the frame. Her expression is a wry, amused half-smile, as if she has been watching something happen across the bar and finds it privately entertaining. Her eyes carry a spark of humor. Her lightly freckled skin shows visible texture with minimal makeup, just tinted lip balm and slightly groomed brows. A thin silver watch sits on her left wrist. Small calluses are visible on her fingertips.

The primary light source is a rectangular fluorescent light in a fixture above a nearby dartboard, throwing a cooler, slightly blue-white light that contrasts with the warm amber of the rest of the bar. This creates a mixed-temperature lighting scenario on her face, with the cool dartboard light on her right side and warm ambient on her left. A string of amber chili-pepper lights runs along the crown molding behind her. The background shows wood paneling, a vintage cigarette machine that no longer works, framed photos of regulars on the wall, and a television showing a muted sports game casting flickering blue light into the far corner.

Shot on a Panasonic Lumix S5 IIX with a Lumix S 50mm f/1.8 lens at f/1.8. ISO 4000, shutter speed 1/80s. White balance set warm at approximately 4200K, though the mixed lighting temperatures prevent a uniform white balance across the frame. Underexposed by one stop. The Lumix color science renders skin tones with a warm, pleasing quality. The f/1.8 provides shallow but manageable depth of field. Grain is moderate with some color noise in the blue-tinted areas from the TV and fluorescent light. The mixed lighting creates color fringing at transition areas where warm and cool light overlap. Mild vignetting at the corners. The TV in the background renders as a soft rectangle of flickering blue-white light.

Eyes placed on the upper-left rule of thirds intersection. Camera at standing eye level. The image feels like a friend just inside the door turned around and caught her leaning against the wall watching the room.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 27
# ============================================================================
PROMPT_27=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s inside Cheer Up Charlies on East Sixth Street in Austin, Texas, during a packed dance night. She has just come off the dance floor and stands near the outdoor bar window, body angled three-quarters to camera left, leaning forward slightly with both hands on the window ledge behind her for support. She wears an electric blue sequined mini dress with a high round neckline, small cap sleeves, and a dramatically open back visible where her torso twists. Every sequin catches and throws light differently, creating a shimmering, almost pixelated surface of blue light across her body. The dress is slightly ridden up from dancing, hem higher on one side than the other. The dress ends high on her thighs. Bare legs with a visible runner of mascara or dark eyeshadow smudged on the inside of one knee from some unknowable bar adventure. Metallic silver strappy heeled sandals, one strap slightly loosened.

Her hair is absolutely wrecked from dancing. Dark strands stick to her neck, her temples, and across her face, plastered down with sweat. Whatever style she started the evening with is completely destroyed. It is magnificent in its chaos.

She fills approximately 75% of the frame. Her expression is pure joy, breathless and wild-eyed, a full open-mouthed grin with her chest heaving slightly from exertion. Eyes are bright and pupils dilated in the dark venue. Her entire face and visible skin glistens with perspiration. Her makeup has traveled significantly, with smoky eye shadow now extending well beyond its intended borders and lipstick worn entirely away. She looks like she is having the best night of her life.

The primary light source is a rotating LED wash light on the ceiling that is currently casting a wash of warm magenta across the space, with the tail end of a blue sweep still visible at the frame edges. A warm white work light above the bar window provides harsh fill from directly above. Strings of globe lights in the outdoor patio area behind her glow through the window. The background shows the edge of the dance floor with moving figures in warm-colored lighting haze.

Shot on a Sigma fp L with a Sigma 45mm f/2.8 DG DN Contemporary lens at f/2.8. ISO 6400, shutter speed 1/125s. White balance set warm at approximately 3500K, clashing intentionally with the magenta LED wash to create unusual color rendering. Underexposed by one stop. The Sigma fp L's distinctive color science renders the mixed LED lighting with a unique quality, less clinical than Sony, more neutral than Fujifilm. The f/2.8 maximum aperture provides less background blur than faster lenses, keeping the dance floor context more present and legible. Grain is significant at ISO 6400, with visible luminance noise throughout. The sequins on her dress create hundreds of tiny specular highlights, some sharp and some blurred, creating a complex pattern. Chromatic aberration is minimal with this lens. The LED wash light creates unusual color banding in the out-of-focus areas.

Eyes placed on the upper-right rule of thirds intersection. Camera at eye level, shot quickly. This looks like a friend grabbed one shot as she surfaced from the dance floor, pure energy captured in a single frame.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 28
# ============================================================================
PROMPT_28=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her early 30s inside Kitty Cohen's on East Seventh Street in Austin, Texas. She sits on a low mid-century modern chair near a small round cocktail table, body angled three-quarters to camera right, one leg crossed over the other, a cocktail coupe with a clear drink in one hand. She wears a mauve pink fine-gauge knit mini dress with a mock neck, long sleeves with ribbed cuffs, and a body-skimming fit that shows the knit stretching slightly across her chest and settling loosely at her hips. The fine knit reveals the texture of a bra strap through the fabric at one shoulder. The mauve pink appears more neutral and dusty under the warm lighting. The dress ends above her knees. She wears charcoal gray opaque thigh-high stockings, the matte gray providing a tonal contrast with the pink dress, their tops hidden under the hem. Gray suede pointed-toe pumps with a slim heel.

Her hair is a shoulder-length bob with a deep side part on the left, the hair swinging in a soft outward curl at the ends, a retro-modern style that moves when she turns her head. The hair is a rich dark brown with warm chestnut highlights visible where the light catches.

She fills approximately 74% of the frame. Her expression is a controlled, knowing smirk, eyes bright and steady on the camera, chin slightly raised, the look of someone who is comfortable being looked at and is looking right back. There is poise in the expression without stiffness. Her medium-toned skin shows a healthy clarity with slight redness at the tip of her nose and a beauty mark on her left cheek near the jawline.

The primary light source is a pink-tinted architectural sconce on the wall beside her, casting a warm rose-gold light across the left side of her face and body that complements her dress tone. A small shaded table lamp on the cocktail table provides a dim warm pool of light from below and to camera right, catching the underside of the cocktail coupe and her chin. The bar's general ambience is warm and low, with mid-century modern design elements in the background, terrazzo floors, arched doorways, and geometric tile work in soft earth tones.

Shot on a Leica M11-P with a Leica Summilux-M 50mm f/1.4 ASPH lens at f/1.4. ISO 3200, shutter speed 1/60s. White balance set warm at approximately 4000K. Underexposed by approximately one stop. The Leica M rangefinder rendering has a distinctive three-dimensional quality, with subject separation that feels different from SLR and mirrorless systems. The Summilux-M produces clean, contrasty images with a signature rendering that enthusiasts recognize. Grain at ISO 3200 is fine and organic. The rangefinder patch in the center of the frame ensures the focus is critically sharp on her near eye. Chromatic aberration is well-controlled but present as faint warm fringing on the bright sconce. Mild vignetting at the corners from the wide aperture. The cocktail coupe's glass catches a complex pattern of reflections from both light sources.

Eyes placed on the upper-left rule of thirds intersection. Camera at seated eye level, held in one hand. The image has the quality of a friend with impeccable taste in cameras taking one unhurried frame.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 29
# ============================================================================
PROMPT_29=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s inside The Lost Well on Red River Street in Austin, Texas, during a heavy metal show. She stands near the merch table at the back of the room, body angled three-quarters to camera left, flipping through a stack of vinyl records with one hand. She wears a leopard print mesh mini dress over a black slim-fitting slip lining, the mesh printing bold and slightly stretched, with fitted long sleeves and a wide scoop neck showing collarbones. The layered construction creates depth, with the leopard pattern on the mesh floating slightly above the solid black beneath. The dress ends above her knees. Bare legs, slightly pale, with a small faded tattoo of a crescent moon on her ankle. Black patent leather mary jane heels with a rounded toe and a single strap with a button closure, the patent reflecting every light source as bright, hard-edged spots.

Her hair is pulled up into two high space buns, slightly uneven in size, with pieces deliberately pulled free around her face and at the nape of her neck, giving the style a casual punk edge rather than a polished look.

She fills approximately 72% of the frame. Her expression is absorbed and focused, brow slightly furrowed, lips pursed in concentration as she examines a record, but her eyes have flicked up to the camera at the last moment, caught in the act of being caught. There is a flash of surprise transitioning to amusement. Her fair skin shows visible redness across her cheeks and the tip of her nose from the warm room. Dark eyeliner is applied thickly but slightly unevenly, intentionally imperfect.

The primary light source is a single caged construction light clamped to the merch table, throwing harsh, direct warm light upward and across the record stacks, illuminating her from below and camera right in an unflattering but authentic way that casts shadows upward across her features. Stage lighting in the deep background is a wall of warm amber and red, visible between heads and shoulders of the crowd. A neon Pabst Blue Ribbon sign behind the merch table provides a red-white accent. The background shows stacks of records, folded band t-shirts, stickers, and the crowd's backs.

Shot on a Canon EOS R7 with a Sigma 30mm f/1.4 DC DN Contemporary lens at f/1.4. ISO 6400, shutter speed 1/100s. White balance set warm at approximately 3800K. Underexposed by one stop. The APS-C crop sensor with the 30mm provides a roughly 48mm equivalent field of view with APS-C depth-of-field characteristics, keeping more background detail visible than full-frame at equivalent aperture. The ISO 6400 on the smaller sensor produces aggressive grain with visible color noise, especially in the red stage-lit background. The construction light from below creates harsh shadows under her nose and brow ridge. Chromatic aberration appears along the bright PBR neon edges. The patent leather mary janes in the lower frame create hard specular highlights that contrast with the matte surroundings.

Eyes placed on the upper-right rule of thirds intersection. Camera at standing eye level, held casually. Looks like a friend browsing merch next to her snapped a photo when she looked up.
PROMPT_EOF
)

# ============================================================================
# CONCEPT 30
# ============================================================================
PROMPT_30=$(cat <<'PROMPT_EOF'
Photorealistic candid portrait of a woman in her late 20s inside Yellow Jacket Social Club on East Cesar Chavez in Austin, Texas, late on a quiet Tuesday night. She stands alone at the jukebox in the back corner, body angled three-quarters to camera right, one arm extended pressing buttons on the jukebox, the other arm crossed loosely across her body holding her opposite elbow. She wears a midnight black matte jersey wrap mini dress with long sleeves and a deep V-neckline secured with a self-tie at the left hip, the matte fabric absorbing light completely in the shadows and showing only the faintest sheen where it stretches across movement. The wrap creates a diagonal line across her torso, and the tie hangs loosely at her hip. The dress ends mid-thigh. She wears sheer black knee-high stockings, visible above the tops of black suede ankle boots with a short block heel and a pull tab at the back.

Her very long dark brown hair with subtle caramel balayage highlights reaches her elbows, parted in the center and falling in loose natural movements on either side, not styled but naturally well-behaved with just enough wave to show life.

She fills approximately 78% of the frame. Her expression is somewhere between wistful and content, a very slight closed-lip smile, eyes soft and slightly unfocused, the expression of someone alone with their thoughts at the end of a long week, choosing music that matches their mood. It is a private moment. Her skin shows end-of-day reality, with makeup mostly gone, natural texture fully visible, a slight puffiness under her eyes, and the honest look of someone not performing for anyone. A simple gold ring on her right middle finger catches a glint.

The primary light source is the illuminated face of the jukebox, casting a warm multi-hued glow across the right side of her face and extended arm, the bubble tubes and selection panels creating a complex light pattern. The rest of the bar is nearly dark, with only the amber glow of a single remaining light above the bar in the distance and the faint red of a neon Open sign that someone forgot to turn off. The quiet emptiness of the nearly closed bar is palpable, with empty stools and bare tables in the dark background, a single forgotten glass on a distant table.

Shot on a Sony A7C with a Sony FE 55mm f/1.8 ZA Sonnar lens at f/1.8. ISO 5000, shutter speed 1/60s. White balance set warm at approximately 3700K. Underexposed by one full stop, letting the empty bar disappear into darkness and keeping only her and the jukebox in visible light. The compact A7C body and Zeiss Sonnar lens produce images with a distinctive micro-contrast and three-dimensional pop. Grain is moderate with the full-frame sensor at ISO 5000, showing fine luminance noise throughout. The Zeiss Sonnar's rendering is slightly different from native Sony G-Master glass, with firmer bokeh edges and higher micro-contrast. The jukebox creates complex colored bokeh where its lights fall out of the focal plane. Chromatic aberration appears as subtle blue fringing at the jukebox's bright panel edges. Moderate vignetting combines with the already dark environment to create a spotlight effect centered on her.

Eyes placed on the upper-left rule of thirds intersection. Camera at standing eye level from across the small room. The image has the quiet intimacy of a friend watching from the bar, raising the camera for one last shot of the night, the kind of photo you look at later and remember exactly how the room felt.
PROMPT_EOF
)

# ============================================================================
# MAIN EXECUTION LOOP
# ============================================================================

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}DIVE BAR CONCEPTS GENERATION SCRIPT${NC}"
echo -e "${GREEN}All 30 Concepts - Sequential with 75-second delays${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Execute all 30 concepts
execute_prompt 1 "$PROMPT_1"
execute_prompt 2 "$PROMPT_2"
execute_prompt 3 "$PROMPT_3"
execute_prompt 4 "$PROMPT_4"
execute_prompt 5 "$PROMPT_5"
execute_prompt 6 "$PROMPT_6"
execute_prompt 7 "$PROMPT_7"
execute_prompt 8 "$PROMPT_8"
execute_prompt 9 "$PROMPT_9"
execute_prompt 10 "$PROMPT_10"
execute_prompt 11 "$PROMPT_11"
execute_prompt 12 "$PROMPT_12"
execute_prompt 13 "$PROMPT_13"
execute_prompt 14 "$PROMPT_14"
execute_prompt 15 "$PROMPT_15"
execute_prompt 16 "$PROMPT_16"
execute_prompt 17 "$PROMPT_17"
execute_prompt 18 "$PROMPT_18"
execute_prompt 19 "$PROMPT_19"
execute_prompt 20 "$PROMPT_20"
execute_prompt 21 "$PROMPT_21"
execute_prompt 22 "$PROMPT_22"
execute_prompt 23 "$PROMPT_23"
execute_prompt 24 "$PROMPT_24"
execute_prompt 25 "$PROMPT_25"
execute_prompt 26 "$PROMPT_26"
execute_prompt 27 "$PROMPT_27"
execute_prompt 28 "$PROMPT_28"
execute_prompt 29 "$PROMPT_29"
execute_prompt 30 "$PROMPT_30"

# ============================================================================
# COMPLETION REPORT
# ============================================================================

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
MINUTES=$((ELAPSED / 60))
SECONDS=$((ELAPSED % 60))

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}GENERATION COMPLETE${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Completed: $COMPLETED/$TOTAL_CONCEPTS"
echo "Failed:    $FAILED/$TOTAL_CONCEPTS"
echo "Total time: ${MINUTES}m ${SECONDS}s"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All concepts generated successfully!${NC}"
  exit 0
else
  echo -e "${RED}✗ $FAILED concept(s) failed${NC}"
  exit 1
fi
