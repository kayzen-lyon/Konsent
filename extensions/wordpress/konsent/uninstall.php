<?php
/**
 * Désinstallation : supprime le score mis en cache. L'extension ne crée
 * aucune autre donnée.
 *
 * @package Konsent
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_transient( 'konsent_score' );
