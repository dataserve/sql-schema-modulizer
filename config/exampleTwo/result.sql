CREATE DATABASE dbName;

CREATE TABLE `user1` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL DEFAULT '',
  `password` varchar(128) NOT NULL DEFAULT '',
  `type` enum('USER','ADMIN') NOT NULL DEFAULT 'USER',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1_swedish_ci;

CREATE TABLE `user1_login` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user1_id` int unsigned NOT NULL DEFAULT '0',
  `modified_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user1_id` (`user1_id`),
  CONSTRAINT `user1_login_ibfk_1` FOREIGN KEY (`user1_id`) REFERENCES `user1` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1_swedish_ci;

CREATE TABLE `user2` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL DEFAULT '',
  `password` varchar(128) NOT NULL DEFAULT '',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=MyISM DEFAULT CHARSET=utf8;

CREATE TABLE `user2_login` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user2_id` int unsigned NOT NULL DEFAULT '0',
  `modified_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user2_id` (`user2_id`),
  CONSTRAINT `user2_login_ibfk_1` FOREIGN KEY (`user2_id`) REFERENCES `user2` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=MyISM DEFAULT CHARSET=utf8;
