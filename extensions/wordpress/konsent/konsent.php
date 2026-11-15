<?php
/**
 * Plugin Name:       Konsent — conformité RGPD
 * Plugin URI:        https://konsent.kayzen-lyon.com/integrations/extensions
 * Description:       Affiche dans le tableau de bord le score de conformité RGPD et cookies de votre site, calculé par Konsent. Aucun traceur, aucun appel depuis les pages publiques.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            KAYZEN (Tarek BELHADJ EI)
 * Author URI:        https://konsent.kayzen-lyon.com
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       konsent
 *
 * @package Konsent
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'KONSENT_VERSION', '1.0.0' );
define( 'KONSENT_SITE', 'https://konsent.kayzen-lyon.com' );
define( 'KONSENT_TRANSIENT', 'konsent_score' );

/**
 * Adresse analysée : domaine et chemin de l'installation, sans schéma.
 *
 * @return string
 */
function konsent_target() {
	$home = wp_parse_url( home_url( '/' ) );
	$host = isset( $home['host'] ) ? $home['host'] : '';
	$path = isset( $home['path'] ) ? untrailingslashit( $home['path'] ) : '';
	return $host . $path;
}

/**
 * Score du site, mis en cache 12 h (1 h en cas d'échec, pour ne pas
 * relancer une analyse à chaque affichage du tableau de bord).
 *
 * @return array{ok: bool, target: string, score?: int, grade?: string, gradeLabel?: string, scannedAt?: string, findings?: int, error?: string}
 */
function konsent_get_score() {
	$target = konsent_target();
	$cached = get_transient( KONSENT_TRANSIENT );
	if ( is_array( $cached ) && isset( $cached['target'] ) && $cached['target'] === $target ) {
		return $cached;
	}

	$response = wp_remote_get(
		KONSENT_SITE . '/api/scan?url=' . rawurlencode( $target ),
		array(
			'timeout'    => 20,
			'user-agent' => 'Konsent-WordPress/' . KONSENT_VERSION,
			'headers'    => array( 'Accept' => 'application/json' ),
		)
	);

	$result = array(
		'ok'     => false,
		'target' => $target,
	);

	if ( is_wp_error( $response ) ) {
		$result['error'] = __( 'Le service Konsent n’a pas répondu à temps. Nouvel essai dans une heure.', 'konsent' );
	} else {
		$code = (int) wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( 200 === $code && is_array( $body ) && isset( $body['scan']['score'] ) ) {
			$result = array(
				'ok'         => true,
				'target'     => $target,
				'score'      => (int) $body['scan']['score'],
				'grade'      => isset( $body['scan']['grade'] ) ? (string) $body['scan']['grade'] : '',
				'gradeLabel' => isset( $body['scan']['gradeLabel'] ) ? (string) $body['scan']['gradeLabel'] : '',
				'scannedAt'  => isset( $body['scan']['scannedAt'] ) ? (string) $body['scan']['scannedAt'] : '',
				'findings'   => isset( $body['findings'] ) && is_array( $body['findings'] ) ? count( $body['findings'] ) : 0,
			);
		} elseif ( 429 === $code ) {
			$result['error'] = __( 'Limite de débit atteinte. Nouvel essai dans une heure.', 'konsent' );
		} elseif ( is_array( $body ) && isset( $body['error'] ) ) {
			$result['error'] = (string) $body['error'];
		} else {
			$result['error'] = __( 'L’analyse n’a pas abouti.', 'konsent' );
		}
	}

	set_transient( KONSENT_TRANSIENT, $result, $result['ok'] ? 12 * HOUR_IN_SECONDS : HOUR_IN_SECONDS );
	return $result;
}

/**
 * Contenu du widget.
 */
function konsent_render_widget() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$data   = konsent_get_score();
	$report = KONSENT_SITE . '/scan?url=' . rawurlencode( $data['target'] );

	echo '<p><strong>' . esc_html__( 'Site analysé :', 'konsent' ) . '</strong> <code>' . esc_html( $data['target'] ) . '</code></p>';

	if ( $data['ok'] ) {
		echo '<p style="font-size:2em;line-height:1.2;margin:0.4em 0;"><strong>' . esc_html( (string) $data['score'] ) . '</strong>/100';
		if ( '' !== $data['grade'] ) {
			echo ' &middot; ' . esc_html__( 'note', 'konsent' ) . ' <strong>' . esc_html( $data['grade'] ) . '</strong>';
		}
		echo '</p>';
		if ( '' !== $data['gradeLabel'] ) {
			echo '<p>' . esc_html( $data['gradeLabel'] ) . '</p>';
		}
		/* translators: %d: nombre d'écarts relevés. */
		echo '<p>' . esc_html( sprintf( _n( '%d écart relevé.', '%d écarts relevés.', $data['findings'], 'konsent' ), $data['findings'] ) ) . '</p>';
		if ( '' !== $data['scannedAt'] ) {
			$time = strtotime( $data['scannedAt'] );
			if ( false !== $time ) {
				/* translators: %s: date de l'analyse. */
				echo '<p class="description">' . esc_html( sprintf( __( 'Analyse du %s.', 'konsent' ), wp_date( get_option( 'date_format' ) . ' H:i', $time ) ) ) . '</p>';
			}
		}
	} else {
		echo '<p>' . esc_html( $data['error'] ) . '</p>';
	}

	echo '<p><a class="button button-primary" href="' . esc_url( $report ) . '" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Voir le rapport complet', 'konsent' ) . '</a></p>';
	echo '<p class="description">' . esc_html__( 'Analyse automatisée et indicative : un score n’est pas un certificat de conformité ni une consultation juridique.', 'konsent' ) . '</p>';
}

/**
 * Enregistrement du widget, réservé aux administrateurs.
 */
function konsent_register_widget() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	wp_add_dashboard_widget(
		'konsent_dashboard_widget',
		esc_html__( 'Konsent — conformité RGPD', 'konsent' ),
		'konsent_render_widget'
	);
}
add_action( 'wp_dashboard_setup', 'konsent_register_widget' );
